import { zipStore, downloadBlob } from './styledExcelExport.js';

const MONTH_FULL = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

const colLetter = (index) => {
  let n = index;
  let letters = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

const xmlEscape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r\n/g, '&#10;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#10;');

const u16 = (view, offset) => view.getUint16(offset, true);
const u32 = (view, offset) => view.getUint32(offset, true);

const inflateRaw = async (bytes) => {
  if (typeof DecompressionStream === 'function') {
    const stream = new Blob([bytes]).stream().pipeThrough(
      new DecompressionStream('deflate-raw'),
    );
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  throw new Error('Cannot inflate Excel template in this browser');
};

const unzip = async (buffer) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const start = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= start; i -= 1) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Invalid Excel template');
  const entries = u16(view, eocd + 10);
  let offset = u32(view, eocd + 16);
  const files = new Map();
  for (let i = 0; i < entries; i += 1) {
    if (u32(view, offset) !== 0x02014b50) throw new Error('Corrupt Excel template');
    const method = u16(view, offset + 10);
    const compSize = u32(view, offset + 20);
    const nameLen = u16(view, offset + 28);
    const extraLen = u16(view, offset + 30);
    const commentLen = u16(view, offset + 32);
    const localOff = u32(view, offset + 42);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen)).replace(/\\/g, '/');
    const localNameLen = u16(view, localOff + 26);
    const localExtraLen = u16(view, localOff + 28);
    const dataStart = localOff + 30 + localNameLen + localExtraLen;
    const compressed = bytes.subarray(dataStart, dataStart + compSize);
    let data;
    if (method === 0) data = compressed.slice();
    else if (method === 8) data = await inflateRaw(compressed);
    else throw new Error(`Unsupported Excel compression ${method}`);
    if (!name.endsWith('/')) files.set(name, data);
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return files;
};

const parseSharedStrings = (xml) => {
  const items = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = re.exec(xml))) {
    items.push(
      [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((part) =>
          part[1]
            .replace(/&#10;/g, '\n')
            .replace(/&quot;/g, '"')
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&amp;/g, '&'),
        )
        .join(''),
    );
  }
  return items;
};

const appendSharedString = (sstXml, text) => {
  const index = (sstXml.match(/<si>/g) || []).length;
  const si = `<si><t xml:space="preserve">${xmlEscape(text)}</t></si>`;
  const nextCount = index + 1;
  const xml = sstXml
    .replace(/uniqueCount="\d+"/, `uniqueCount="${nextCount}"`)
    .replace(/count="\d+"/, `count="${nextCount}"`)
    .replace(/<\/sst>/, `${si}</sst>`);
  return { xml, index };
};

const cellRef = (col, row) => `${colLetter(col)}${row}`;

const eachCell = (sheetXml, fn) => {
  const re = /<c r="([A-Z]+)(\d+)"([^>]*?)(\/>|>)/g;
  let match;
  while ((match = re.exec(sheetXml))) {
    const col = match[1];
    const row = Number(match[2]);
    const attrs = match[3] || '';
    let inner = '';
    if (match[4] !== '/>') {
      const end = sheetXml.indexOf('</c>', match.index);
      if (end < 0) break;
      inner = sheetXml.slice(match.index + match[0].length, end);
      re.lastIndex = end + 4;
    }
    fn({ col, row, attrs, inner, index: match.index, tag: match[0] });
  }
};

const listSheetCells = (sheetXml, strings) => {
  const cells = [];
  eachCell(sheetXml, ({ col, row, attrs, inner }) => {
    const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
    let text = '';
    let number = null;
    if (/t="s"/.test(attrs) && v != null) text = strings[Number(v)] ?? '';
    else if (v != null && v !== '' && !Number.isNaN(Number(v))) number = Number(v);
    else if (inner.includes('<t')) {
      text = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join('');
    }
    cells.push({ col, row, text, number });
  });
  return cells;
};

const setCellValue = (sheetXml, row, col, kind, value, sst) => {
  const ref = cellRef(col, row);
  let found = null;
  eachCell(sheetXml, (cell) => {
    if (cell.col + cell.row === ref) found = cell;
  });
  const style = found?.attrs?.match(/s="(\d+)"/)?.[1];
  const styleAttr = style ? ` s="${style}"` : '';
  let cellXml;
  if (kind === 'empty') cellXml = `<c r="${ref}"${styleAttr}/>`;
  else if (kind === 'number') cellXml = `<c r="${ref}"${styleAttr}><v>${Number(value) || 0}</v></c>`;
  else {
    const next = appendSharedString(sst.xml, value ?? '');
    sst.xml = next.xml;
    cellXml = `<c r="${ref}"${styleAttr} t="s"><v>${next.index}</v></c>`;
  }
  if (found) {
    const close = found.index + found.tag.length;
    const to = found.tag.endsWith('/>') ? close : sheetXml.indexOf('</c>', close) + 4;
    return `${sheetXml.slice(0, found.index)}${cellXml}${sheetXml.slice(to)}`;
  }
  const rowRe = new RegExp(`(<row r="${row}"[^>]*>)([\\s\\S]*?)(</row>)`);
  if (!rowRe.test(sheetXml)) return sheetXml;
  return sheetXml.replace(rowRe, (_, open, inner, close) => `${open}${inner}${cellXml}${close}`);
};

const subjectFromText = (text) => {
  const value = String(text || '').toUpperCase();
  if (value.includes('CITY PAID')) return 'CITY PAID';
  if (value.includes('GENERAL ADMINISTRATION')) return 'GENERAL ADMINISTRATION';
  if (value.includes('NEWLY PROMOTED') || value.includes('NEW PROMOTED')) return 'NEWLY PROMOTED';
  return '';
};

const parseWorkbookSheets = (workbookXml, relsXml) => {
  const rels = {};
  for (const match of relsXml.matchAll(/<Relationship Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    const target = match[2].replace(/\\/g, '/');
    rels[match[1]] = target.startsWith('xl/') ? target : `xl/${target.replace(/^\.\//, '')}`;
  }
  const sheets = [];
  for (const match of workbookXml.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    sheets.push({ name: match[1], path: rels[match[2]] });
  }
  return sheets;
};

const MONTH_ALIAS = {
  JANUARY: 'JANUARY', JAN: 'JANUARY',
  FEBRUARY: 'FEBRUARY', FEB: 'FEBRUARY',
  MARCH: 'MARCH', MAR: 'MARCH',
  APRIL: 'APRIL', APR: 'APRIL',
  MAY: 'MAY',
  JUNE: 'JUNE', JUN: 'JUNE',
  JULY: 'JULY', JUL: 'JULY',
  AUGUST: 'AUGUST', AUG: 'AUGUST',
  SEPTEMBER: 'SEPTEMBER', SEP: 'SEPTEMBER', SEPT: 'SEPTEMBER',
  OCTOBER: 'OCTOBER', OCT: 'OCTOBER',
  NOVEMBER: 'NOVEMBER', NOV: 'NOVEMBER',
  DECEMBER: 'DECEMBER', DEC: 'DECEMBER',
};

const adminKey = (name) => {
  const match = String(name || '')
    .trim()
    .toUpperCase()
    .match(/^ADMIN\s+([A-Z]+)\s+(\d{4})$/);
  if (!match) return '';
  const month = MONTH_ALIAS[match[1]];
  return month ? `${month} ${match[2]}` : '';
};

const colIndex = (letters) => {
  let n = 0;
  for (const ch of String(letters || '')) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
};

const MONTH_TITLE = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const periodMeta = (year, month) => {
  const m = Math.min(Math.max(Number(month) || 1, 1), 12);
  const y = Number(year) || new Date().getFullYear();
  const last = new Date(y, m, 0).getDate();
  const upper = MONTH_FULL[m - 1];
  const title = MONTH_TITLE[m - 1];
  return {
    letterDate: new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    salaryRange: `${upper} 1-${last}, ${y}`,
    absenceRange: `${title} 1-${last}, ${y}`,
  };
};

const rewritePeriodLabels = (sheetXml, sst, period) => {
  if (!period) return sheetXml;
  const strings = parseSharedStrings(sst.xml);
  const cells = listSheetCells(sheetXml, strings);
  let xml = sheetXml;
  const monthDate = new RegExp(
    `^(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2},\\s+\\d{4}$`,
    'i',
  );
  cells.forEach((cell) => {
    const text = String(cell.text || '').trim();
    if (!text) return;
    const col = colIndex(cell.col);
    if (/REGULAR SALARY/i.test(text)) {
      xml = setCellValue(xml, cell.row, col, 'text', `REGULAR SALARY- ${period.salaryRange}`, sst);
    } else if (/PERA/i.test(text)) {
      xml = setCellValue(xml, cell.row, col, 'text', `PERA & ADDCOM - ${period.salaryRange}`, sst);
    } else if (/Without Pay for/i.test(text)) {
      xml = setCellValue(
        xml,
        cell.row,
        col,
        'text',
        `Without Pay for the month of ${period.absenceRange}, as shown in their Log sheets with the request that the same`,
        sst,
      );
    } else if (monthDate.test(text)) {
      xml = setCellValue(xml, cell.row, col, 'text', period.letterDate, sst);
    }
  });
  return xml;
};
const rankDepartment = (name) => {
  const value = String(name || '').toUpperCase();
  if (value === 'GENERAL ADMINISTRATION') return 0;
  if (value === 'CITY PAID') return 1;
  return 2;
};

const writeSlot = (xml, sst, slot, nextRow, emp) => {
  let next = xml;
  if (!emp) {
    next = setCellValue(next, slot.row, 2, 'empty', '', sst);
    next = setCellValue(next, slot.row, 3, 'empty', '', sst);
    next = setCellValue(next, slot.row, 4, 'empty', '', sst);
    next = setCellValue(next, slot.row, 5, 'empty', '', sst);
    next = setCellValue(next, slot.row, 6, 'empty', '', sst);
    next = setCellValue(next, slot.row, 7, 'empty', '', sst);
    for (let row = slot.row + 1; row < nextRow; row += 1) {
      next = setCellValue(next, row, 3, 'empty', '', sst);
    }
    return next;
  }
  const dateLines = String(emp.dates || '')
    .split(/\n/)
    .filter((line, i) => line || i === 0);
  next = setCellValue(next, slot.row, 2, 'text', emp.name || '', sst);
  next = setCellValue(next, slot.row, 3, 'text', dateLines[0] || '', sst);
  next = setCellValue(next, slot.row, 4, 'text', emp.officialTime || '', sst);
  next = setCellValue(next, slot.row, 5, 'number', emp.dd ?? 0, sst);
  next = setCellValue(next, slot.row, 6, 'number', emp.hh ?? 0, sst);
  next = setCellValue(next, slot.row, 7, 'number', emp.mm ?? 0, sst);
  for (let extra = 1, row = slot.row + 1; extra < dateLines.length && row < nextRow; extra += 1, row += 1) {
    next = setCellValue(next, row, 3, 'text', dateLines[extra], sst);
  }
  return next;
};

const collectPages = (sheetXml, sst) => {
  const strings = parseSharedStrings(sst.xml);
  const cells = listSheetCells(sheetXml, strings);
  const byRow = new Map();
  cells.forEach((cell) => {
    if (!byRow.has(cell.row)) byRow.set(cell.row, {});
    byRow.get(cell.row)[cell.col] = cell;
  });
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  let subject = 'GENERAL ADMINISTRATION';
  let subjectCell = null;
  const slots = [];
  let seenNames = false;
  rows.forEach((row) => {
    const cols = byRow.get(row);
    const rowText = Object.values(cols).map((cell) => cell.text || '').join(' ');
    if (/Dr\.?\s*GIOVANNI/i.test(rowText)) {
      seenNames = false;
      subject = String(cols.D?.text || '').trim().toUpperCase() || subjectFromText(rowText) || subject;
      subjectCell = { row, col: 4 };
    }
    if (String(cols.B?.text || '').toUpperCase() === 'NAMES') seenNames = true;
    const no = cols.A?.number;
    if (
      seenNames &&
      Number.isInteger(no) &&
      no >= 1 &&
      no <= 40 &&
      String(cols.B?.text || '').toUpperCase() !== 'NAMES'
    ) {
      slots.push({ row, no, subject, subjectCell });
    }
  });

  const pages = [];
  slots.forEach((slot, index) => {
    const prev = slots[index - 1];
    if (!prev || prev.subject !== slot.subject || slot.no <= prev.no) {
      pages.push({
        subject: slot.subject,
        subjectCell: slot.subjectCell,
        slots: [slot],
      });
    } else {
      pages[pages.length - 1].slots.push(slot);
    }
  });
  return { slots, pages };
};

const rewritePreparedBy = (sheetXml, sst, preparedBy) => {
  const name = String(preparedBy?.name || '').trim();
  if (!name) return sheetXml;
  const title = String(preparedBy?.title || 'In-Charge, Attendance Section').trim()
    || 'In-Charge, Attendance Section';
  const strings = parseSharedStrings(sst.xml);
  const cells = listSheetCells(sheetXml, strings);
  const starts = cells
    .filter((cell) => /^prepared by:?$/i.test(String(cell.text || '').trim()))
    .map((cell) => cell.row);
  let xml = sheetXml;
  starts.forEach((start) => {
    const nearby = cells.filter((cell) =>
      cell.row > start &&
      cell.row <= start + 8 &&
      colIndex(cell.col) === 2 &&
      String(cell.text || '').trim() &&
      !/^page\s+\d+/i.test(String(cell.text || '').trim()),
    );
    const nameCell = nearby[0];
    const titleCell = nearby.find((cell) => /in-charge/i.test(cell.text)) || nearby[1];
    if (nameCell) xml = setCellValue(xml, nameCell.row, colIndex(nameCell.col), 'text', name.toUpperCase(), sst);
    if (titleCell) xml = setCellValue(xml, titleCell.row, colIndex(titleCell.col), 'text', title, sst);
  });
  return xml;
};

const fillAdminSheet = (sheetXml, sst, employees = [], period = null, preparedBy = null) => {
  const { slots, pages } = collectPages(sheetXml, sst);
  let xml = rewritePeriodLabels(sheetXml, sst, period);
  xml = rewritePreparedBy(xml, sst, preparedBy);

  slots.forEach((slot, index) => {
    const nextRow = slots[index + 1]?.row || slot.row + 1;
    xml = writeSlot(xml, sst, slot, nextRow, null);
  });
  pages.forEach((page) => {
    if (page.subjectCell) {
      xml = setCellValue(xml, page.subjectCell.row, page.subjectCell.col, 'empty', '', sst);
    }
  });

  if (!employees.length || !pages.length) return xml;

  const byDept = new Map();
  employees.forEach((emp) => {
    const dept = String(emp.department || emp.subject || 'GENERAL ADMINISTRATION').trim().toUpperCase()
      || 'GENERAL ADMINISTRATION';
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept).push(emp);
  });
  byDept.forEach((list) => {
    list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  });
  const deptOrder = [...byDept.keys()].sort((a, b) => {
    const rank = rankDepartment(a) - rankDepartment(b);
    return rank !== 0 ? rank : a.localeCompare(b);
  });

  let deptIdx = 0;
  let queue = [...(byDept.get(deptOrder[0]) || [])];
  let currentDept = deptOrder[0] || '';

  pages.forEach((page) => {
    if (!queue.length && deptIdx < deptOrder.length - 1) {
      deptIdx += 1;
      currentDept = deptOrder[deptIdx];
      queue = [...(byDept.get(currentDept) || [])];
    }
    const placing = queue.length > 0;
    if (page.subjectCell) {
      xml = placing
        ? setCellValue(xml, page.subjectCell.row, page.subjectCell.col, 'text', currentDept, sst)
        : setCellValue(xml, page.subjectCell.row, page.subjectCell.col, 'empty', '', sst);
    }
    page.slots.forEach((slot) => {
      const globalIndex = slots.findIndex((item) => item.row === slot.row);
      const nextRow = slots[globalIndex + 1]?.row || slot.row + 1;
      xml = writeSlot(xml, sst, slot, nextRow, queue.shift() || null);
    });
  });
  return xml;
};

const templateUrl = () => {
  const base =
    typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL
      ? import.meta.env.BASE_URL
      : '/';
  return `${base}templates/non-teaching-abstract.xlsx`;
};

const loadTemplateBytes = async () => {
  if (typeof fetch === 'function') {
    const res = await fetch(templateUrl());
    if (res.ok) return new Uint8Array(await res.arrayBuffer());
  }
  throw new Error('Abstract template is missing');
};

const adminSheetName = (year, month) =>
  `ADMIN ${MONTH_FULL[Math.min(Math.max(Number(month) || 1, 1), 12) - 1]} ${Number(year) || ''}`.slice(0, 31);

const worksheetPath = (index) => `xl/worksheets/sheet${index}.xml`;
const worksheetRelsPath = (index) => `xl/worksheets/_rels/sheet${index}.xml.rels`;

const rebuildAdminWorkbook = (files, sst, months, preparedBy = null) => {
  const workbookXml = decoder.decode(files.get('xl/workbook.xml'));
  const relsXml = decoder.decode(files.get('xl/_rels/workbook.xml.rels'));
  const sheets = parseWorkbookSheets(workbookXml, relsXml);
  const master = sheets.find((sheet) => adminKey(sheet.name) && files.get(sheet.path)) || sheets[0];
  if (!master?.path || !files.get(master.path)) throw new Error('Abstract template has no ADMIN sheet');
  const masterXml = decoder.decode(files.get(master.path));
  const masterRels = files.get(`xl/worksheets/_rels/${master.path.split('/').pop()}.rels`);

  for (const name of [...files.keys()]) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) files.delete(name);
    if (/^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(name)) files.delete(name);
  }

  const filled = months.map((month) => ({
    name: adminSheetName(month.year, month.month),
    xml: fillAdminSheet(masterXml, sst, month.employees || [], periodMeta(month.year, month.month), preparedBy),
  }));

  filled.forEach((sheet, index) => {
    const n = index + 1;
    files.set(worksheetPath(n), encoder.encode(sheet.xml));
    if (masterRels) files.set(worksheetRelsPath(n), masterRels);
  });

  const sheetTags = filled
    .map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('');
  let nextWorkbook = workbookXml.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets>${sheetTags}</sheets>`);
  nextWorkbook = nextWorkbook.replace(/activeTab="\d+"/, 'activeTab="0"');
  files.set('xl/workbook.xml', encoder.encode(nextWorkbook));

  const otherRels = [];
  for (const match of relsXml.matchAll(/<Relationship Id="([^"]+)" Type="([^"]+)" Target="([^"]+)"/g)) {
    if (match[2].includes('/worksheet')) continue;
    otherRels.push({ type: match[2], target: match[3] });
  }
  const relParts = [
    ...filled.map((_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    ),
    ...otherRels.map((rel, index) =>
      `<Relationship Id="rId${filled.length + 1 + index}" Type="${rel.type}" Target="${rel.target}"/>`,
    ),
  ];
  files.set(
    'xl/_rels/workbook.xml.rels',
    encoder.encode(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relParts.join('')}</Relationships>`,
    ),
  );

  let contentTypes = decoder.decode(files.get('[Content_Types].xml'));
  contentTypes = contentTypes.replace(/<Override PartName="\/xl\/worksheets\/sheet\d+\.xml"[^>]*\/>/g, '');
  const sheetOverrides = filled
    .map((_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('');
  contentTypes = contentTypes.replace('</Types>', `${sheetOverrides}</Types>`);
  files.set('[Content_Types].xml', encoder.encode(contentTypes));

  const appPath = 'docProps/app.xml';
  if (files.has(appPath)) {
    let app = decoder.decode(files.get(appPath));
    app = app.replace(/<vt:i4>\d+<\/vt:i4>/, `<vt:i4>${filled.length}</vt:i4>`);
    const titles = filled.map((sheet) => `<vt:lpstr>${xmlEscape(sheet.name)}</vt:lpstr>`).join('');
    app = app.replace(
      /<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/,
      `<TitlesOfParts><vt:vector size="${filled.length}" baseType="lpstr">${titles}</vt:vector></TitlesOfParts>`,
    );
    files.set(appPath, encoder.encode(app));
  }
};

export const downloadAbstractFormExcel = async ({ filename, months = [], templateBytes, preparedBy } = {}) => {
  const files = await unzip(templateBytes || await loadTemplateBytes());
  const sst = { xml: decoder.decode(files.get('xl/sharedStrings.xml')) };
  const monthSheets = (months || []).filter((month) => month && month.year && month.month);
  if (!monthSheets.length) throw new Error('No months to export');
  rebuildAdminWorkbook(files, sst, monthSheets, preparedBy);
  files.set('xl/sharedStrings.xml', encoder.encode(sst.xml));

  const bytes = zipStore([...files.entries()].map(([name, data]) => ({ name, data })));
  const outName = String(filename || 'Non Teaching ABSTRACT.xlsx').toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename || 'Non Teaching ABSTRACT'}.xlsx`;
  if (typeof window === 'undefined') return { filename: outName, bytes };
  downloadBlob(bytes, outName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return { filename: outName, bytes };
};
