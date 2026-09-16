/**
 * Surgical editor for macro-enabled workbooks.
 *
 * The EARIST payroll template carries a VBA project (the PAY sheets call
 * PesosInWords2Caps), 27 drawings, an embedded image and 32 printer-settings blobs.
 * Every Excel library available to Node loses at least one of those on a round trip,
 * so instead of rebuilding the workbook we unzip it, rewrite only the <c> elements we
 * need inside xl/worksheets/sheetN.xml, and repack. Untouched cells keep their exact
 * original markup and untouched package parts are copied through verbatim.
 */

const { unzipSync, zipSync, strToU8, strFromU8 } = require('fflate');
const { colToIndex, indexToCol, parseRef, translateFormula, shiftFormulaRowsFrom } = require('./formulaTranslate');

const CELL_RE = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
const ROW_RE = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
const F_RE = /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/;
const V_RE = /<v[^>]*>([\s\S]*?)<\/v>/;

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function getAttr(attrs, name) {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
}

/**
 * Resolves an OPC relationship Target against the folder holding the source part.
 * e.g. ('xl/worksheets', '../drawings/drawing2.xml') -> 'xl/drawings/drawing2.xml'
 */
function resolvePartPath(baseDir, target) {
  if (target.startsWith('/')) return target.slice(1);
  const out = [];
  for (const segment of `${baseDir}/${target}`.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') out.pop();
    else out.push(segment);
  }
  return out.join('/');
}

function setAttr(attrs, name, value) {
  const re = new RegExp(`\\s${name}="[^"]*"`);
  if (value === null) return attrs.replace(re, '');
  if (re.test(attrs)) return attrs.replace(re, ` ${name}="${value}"`);
  return `${attrs} ${name}="${value}"`;
}

function quoteSheetName(name) {
  return `'${String(name).replace(/'/g, "''")}'`;
}

/**
 * Rewrites sheet refs from `from` to `to` in a formula, defined-name body, or
 * worksheet XML. Excel stores Print_Area as PAY!$B$2 when the tab has no spaces
 * and as 'GEN.AD - PAY'!$B$2 when it does. Cloned department tabs always have
 * spaces, so the replacement is always quoted.
 */
function retargetSheetRef(body, from, to) {
  if (!from || !to || from === to) return body;
  const quotedTo = quoteSheetName(to);
  return String(body).replace(/'(?:[^']|'')+'|[A-Za-z0-9_.]+(?=!)/g, (tok) => {
    if (tok.startsWith("'")) {
      const inner = tok.slice(1, -1).replace(/''/g, "'");
      return inner === from ? quotedTo : tok;
    }
    return tok === from ? quotedTo : tok;
  });
}

class Cell {
  constructor(ref, attrs, inner) {
    this.ref = ref;
    this.attrs = attrs;
    this.inner = inner || '';
    this.col = colToIndex(/^([A-Za-z]{1,3})/.exec(ref)[1]);
  }

  static parse(attrs, inner) {
    const ref = getAttr(attrs, 'r');
    return ref ? new Cell(ref, attrs, inner) : null;
  }

  /** @returns {string|null} formula body without the leading "=" */
  get formula() {
    const m = F_RE.exec(this.inner);
    if (!m) return null;
    const body = m[2];
    return body ? unescapeXml(body) : '';
  }

  /** @returns {boolean} true when the formula is a shared-group member or master */
  get sharedInfo() {
    const m = F_RE.exec(this.inner);
    if (!m) return null;
    const attrs = m[1] || '';
    if (getAttr(attrs, 't') !== 'shared') return null;
    return { si: getAttr(attrs, 'si'), ref: getAttr(attrs, 'ref'), body: m[2] ? unescapeXml(m[2]) : '' };
  }

  setNumber(value) {
    this.attrs = setAttr(this.attrs, 't', null);
    this.inner = `<v>${Number(value)}</v>`;
  }

  setText(value) {
    const text = String(value);
    if (text === '') { this.clear(); return; }
    this.attrs = setAttr(this.attrs, 't', 'inlineStr');
    this.inner = `<is><t xml:space="preserve">${escapeXml(text)}</t></is>`;
  }

  /** Writes a plain formula and drops any cached result. */
  setFormula(body) {
    this.attrs = setAttr(this.attrs, 't', null);
    this.inner = `<f>${escapeXml(body)}</f>`;
  }

  /** Empties the cell but keeps its style so the printed grid is unchanged. */
  clear() {
    this.attrs = setAttr(this.attrs, 't', null);
    this.inner = '';
  }

  toXml() {
    return this.inner ? `<c${this.attrs}>${this.inner}</c>` : `<c${this.attrs}/>`;
  }
}

class Row {
  constructor(num, attrs, inner) {
    this.num = num;
    this.attrs = attrs;
    this.cells = [];
    this.byCol = new Map();
    if (inner) {
      CELL_RE.lastIndex = 0;
      let m;
      while ((m = CELL_RE.exec(inner)) !== null) {
        const cell = Cell.parse(m[1], m[2]);
        if (cell) { this.cells.push(cell); this.byCol.set(cell.col, cell); }
      }
    }
  }

  cell(col) {
    return this.byCol.get(col) || null;
  }

  /** Creates the cell in column order, cloning a donor's style when given. */
  ensureCell(col, donor) {
    const existing = this.byCol.get(col);
    if (existing) return existing;
    const ref = indexToCol(col) + this.num;
    let attrs = ` r="${ref}"`;
    if (donor) {
      const style = getAttr(donor.attrs, 's');
      if (style !== null) attrs += ` s="${style}"`;
    }
    const cell = new Cell(ref, attrs, '');
    const at = this.cells.findIndex((c) => c.col > col);
    if (at === -1) this.cells.push(cell); else this.cells.splice(at, 0, cell);
    this.byCol.set(col, cell);
    return cell;
  }

  toXml() {
    if (this.cells.length === 0) return `<row${this.attrs}/>`;
    return `<row${this.attrs}>${this.cells.map((c) => c.toXml()).join('')}</row>`;
  }
}

class Sheet {
  constructor(name, xml) {
    this.name = name;
    const open = /<sheetData\b[^>]*>/.exec(xml);
    if (!open) throw new Error(`No <sheetData> in sheet ${name}`);
    const closeAt = xml.indexOf('</sheetData>', open.index);
    if (closeAt === -1) throw new Error(`Unterminated <sheetData> in sheet ${name}`);

    this.head = xml.slice(0, open.index + open[0].length);
    this.tail = xml.slice(closeAt);

    const body = xml.slice(open.index + open[0].length, closeAt);
    this.rows = [];
    this.byNum = new Map();
    ROW_RE.lastIndex = 0;
    let m;
    while ((m = ROW_RE.exec(body)) !== null) {
      const num = Number(getAttr(m[1], 'r'));
      if (!num) continue;
      const row = new Row(num, m[1], m[2]);
      this.rows.push(row);
      this.byNum.set(num, row);
    }
  }

  row(num) {
    return this.byNum.get(num) || null;
  }

  /** Creates the row in order, cloning a donor row's height attributes when given. */
  ensureRow(num, donorNum) {
    const existing = this.byNum.get(num);
    if (existing) return existing;
    const donor = donorNum ? this.byNum.get(donorNum) : null;
    const attrs = donor ? setAttr(donor.attrs, 'r', String(num)) : ` r="${num}"`;
    const row = new Row(num, attrs, '');
    const at = this.rows.findIndex((r) => r.num > num);
    if (at === -1) this.rows.push(row); else this.rows.splice(at, 0, row);
    this.byNum.set(num, row);
    return row;
  }

  cell(ref) {
    const { col, row } = parseRef(ref);
    const r = this.byNum.get(row);
    return r ? r.cell(col) : null;
  }

  /** @returns {string|null} formula body of a cell, shared groups already expanded */
  formulaAt(ref) {
    const c = this.cell(ref);
    return c ? c.formula : null;
  }

  setNumber(ref, value, donorRef) { this.writable(ref, donorRef).setNumber(value); }
  setText(ref, value, donorRef) { this.writable(ref, donorRef).setText(value); }
  setFormula(ref, body, donorRef) { this.writable(ref, donorRef).setFormula(body); }

  clearCell(ref) {
    const c = this.cell(ref);
    if (c) c.clear();
  }

  writable(ref, donorRef) {
    const { col, row } = parseRef(ref);
    const donorParsed = donorRef ? parseRef(donorRef) : null;
    const r = this.ensureRow(row, donorParsed ? donorParsed.row : undefined);
    const donorCell = donorParsed
      ? (this.byNum.get(donorParsed.row) || { cell: () => null }).cell(donorParsed.col)
      : null;
    return r.ensureCell(col, donorCell);
  }

  /**
   * Copies a row's cells onto another row. Formulas are copied as-is (no row
   * translation) so SUMMARY subtotal refs like PAY!I163 stay on the subtotal.
   */
  copyRow(fromNum, toNum) {
    const src = this.row(fromNum);
    if (!src) return;
    const dest = this.ensureRow(toNum, fromNum);
    dest.cells = [];
    dest.byCol = new Map();
    for (const cell of src.cells) {
      const newRef = indexToCol(cell.col) + toNum;
      const clone = new Cell(newRef, setAttr(cell.attrs, 'r', newRef), cell.inner);
      dest.cells.push(clone);
      dest.byCol.set(cell.col, clone);
    }
  }

  /**
   * Inserts blank row slots by moving every row at/after `fromRow` down `dRow`
   * positions, including formulas and merge refs that pointed at those rows.
   */
  shiftRowsFrom(fromRow, dRow) {
    if (!dRow) return;
    const moving = this.rows.filter((r) => r.num >= fromRow).sort((a, b) => b.num - a.num);
    for (const row of moving) {
      const newNum = row.num + dRow;
      this.byNum.delete(row.num);
      row.num = newNum;
      row.attrs = setAttr(row.attrs, 'r', String(newNum));
      for (const cell of row.cells) {
        const newRef = indexToCol(cell.col) + newNum;
        cell.ref = newRef;
        cell.attrs = setAttr(cell.attrs, 'r', newRef);
        const f = cell.formula;
        if (f !== null) cell.setFormula(shiftFormulaRowsFrom(f, fromRow, dRow));
      }
      this.byNum.set(newNum, row);
    }
    this.rows.sort((a, b) => a.num - b.num);
    this.tail = this.tail.replace(/<mergeCell ref="([^"]+)"\/>/g, (full, ref) => {
      const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(ref);
      if (!m) return full;
      const r1 = Number(m[2]) >= fromRow ? Number(m[2]) + dRow : Number(m[2]);
      const r2 = Number(m[4]) >= fromRow ? Number(m[4]) + dRow : Number(m[4]);
      return `<mergeCell ref="${m[1]}${r1}:${m[3]}${r2}"/>`;
    });
  }

  addHorizontalMergesFromRow(fromRow, toRow) {
    const extra = [];
    for (const m of this.tail.matchAll(/<mergeCell ref="([^"]+)"\/>/g)) {
      const parsed = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(m[1]);
      if (!parsed) continue;
      if (Number(parsed[2]) !== fromRow || Number(parsed[4]) !== fromRow) continue;
      extra.push(`<mergeCell ref="${parsed[1]}${toRow}:${parsed[3]}${toRow}"/>`);
    }
    if (!extra.length) return;
    if (/<mergeCells\b/.test(this.tail)) {
      this.tail = this.tail.replace(/<mergeCells count="(\d+)"/, (full, n) => (
        `<mergeCells count="${Number(n) + extra.length}"`
      ));
      this.tail = this.tail.replace('</mergeCells>', `${extra.join('')}</mergeCells>`);
    }
  }

  /**
   * Expands every shared formula into an explicit one and drops all cached results.
   *
   * Both halves matter. Shared groups have to go because stamping or clearing a
   * group's master would orphan its members and make Excel report the file as
   * corrupt. Cached results have to go because a value written by this export
   * invalidates every formula downstream of it, and a stale figure from a previous
   * period must never be printable.
   */
  normalizeFormulas() {
    const masters = new Map();

    for (const row of this.rows) {
      for (const cell of row.cells) {
        const shared = cell.sharedInfo;
        if (shared && shared.ref && shared.body) {
          masters.set(shared.si, { body: shared.body, origin: parseRef(cell.ref) });
        }
      }
    }

    for (const row of this.rows) {
      for (const cell of row.cells) {
        const m = F_RE.exec(cell.inner);
        if (!m) {
          // Value cell: leave exactly as-is.
          continue;
        }
        const fAttrs = m[1] || '';
        let body = m[2] ? unescapeXml(m[2]) : '';

        if (getAttr(fAttrs, 't') === 'shared') {
          const si = getAttr(fAttrs, 'si');
          const master = masters.get(si);
          if (!master) {
            if (!body) throw new Error(`Sheet ${this.name}: shared formula si=${si} at ${cell.ref} has no master`);
          } else {
            const here = parseRef(cell.ref);
            body = translateFormula(master.body, here.row - master.origin.row, here.col - master.origin.col);
          }
        } else if (getAttr(fAttrs, 't') === 'array') {
          // Array formulas keep their ref/t attributes; only the cached value goes.
          cell.attrs = setAttr(cell.attrs, 't', null);
          cell.inner = `<f${fAttrs}>${escapeXml(body)}</f>`;
          continue;
        }

        cell.setFormula(body);
      }
    }
  }

  toXml() {
    return this.head + this.rows.map((r) => r.toXml()).join('') + this.tail;
  }
}

class XlsmPackage {
  constructor(entries) {
    this.entries = entries;
    this.sheets = new Map();
    this.sheetPaths = this.readSheetIndex();
  }

  /** @param {Buffer} buffer @returns {XlsmPackage} */
  static load(buffer) {
    return new XlsmPackage(unzipSync(new Uint8Array(buffer)));
  }

  text(path) {
    const e = this.entries[path];
    if (!e) throw new Error(`Missing package part: ${path}`);
    return strFromU8(e);
  }

  writeText(path, value) {
    this.entries[path] = strToU8(value);
  }

  readSheetIndex() {
    const rels = this.text('xl/_rels/workbook.xml.rels');
    const relTargets = new Map();
    for (const m of rels.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) {
      relTargets.set(m[1], m[2]);
    }
    // Target may appear before Id depending on how the file was written.
    for (const m of rels.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"/g)) {
      if (!relTargets.has(m[2])) relTargets.set(m[2], m[1]);
    }

    const wb = this.text('xl/workbook.xml');
    const paths = new Map();
    for (const m of wb.matchAll(/<sheet\b[^>]*\/>/g)) {
      const tag = m[0];
      const name = getAttr(tag, 'name');
      const rid = getAttr(tag, 'r:id') || getAttr(tag, 'id');
      if (!name || !rid) continue;
      const target = relTargets.get(rid);
      if (!target) continue;
      paths.set(name, 'xl/' + target.replace(/^\/xl\//, '').replace(/^\.\//, ''));
    }
    return paths;
  }

  /** @param {string} name sheet name as shown on the tab @returns {Sheet} */
  sheet(name) {
    const cached = this.sheets.get(name);
    if (cached) return cached;
    const path = this.sheetPaths.get(name);
    if (!path) throw new Error(`No such sheet: ${name}`);
    const sheet = new Sheet(name, this.text(path));
    this.sheets.set(name, sheet);
    return sheet;
  }

  sheetNames() {
    return [...this.sheetPaths.keys()];
  }

  /** Next free part path of the form dir/a33genN.ext. */
  nextGeneratedPath(dir, ext) {
    let i = 1;
    let candidate = `${dir}/a33gen${i}.${ext}`;
    while (this.entries[candidate]) {
      i += 1;
      candidate = `${dir}/a33gen${i}.${ext}`;
    }
    return candidate;
  }

  /** Duplicates a part's `<Override>` in [Content_Types].xml under a new part name. */
  copyContentTypeOverride(fromPath, toPath) {
    const ctPath = '[Content_Types].xml';
    if (!this.entries[ctPath]) return;
    const ct = this.text(ctPath);
    const existing = new RegExp(`<Override\\b[^>]*PartName="/${fromPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`).exec(ct);
    if (!existing) return; // covered by a Default extension rule
    this.writeText(ctPath, ct.replace('</Types>', `${existing[0].replace(`/${fromPath}`, `/${toPath}`)}</Types>`));
  }

  /**
   * Deep-copies a part and its relationship file.
   *
   * Used for drawings: a drawing part belongs to exactly one sheet, so a copied
   * sheet needs its own. The drawing's own relationships (to xl/media images)
   * are carried over untouched, because image parts are shared safely and that
   * is what keeps the EARIST logo on a generated tab.
   *
   * @returns {string} path of the new part
   */
  copyPart(sourcePath, dir, ext) {
    const newPath = this.nextGeneratedPath(dir, ext);
    this.entries[newPath] = this.entries[sourcePath];

    const relsOf = (p) => p.replace(/([^/]+)$/, '_rels/$1.rels');
    if (this.entries[relsOf(sourcePath)]) {
      this.entries[relsOf(newPath)] = this.entries[relsOf(sourcePath)];
    }
    this.copyContentTypeOverride(sourcePath, newPath);
    return newPath;
  }

  /**
   * Copies a worksheet's relationship file for a generated sheet.
   *
   * Drawings and printer settings belong to one sheet each, so the copy gets its
   * own; that is what keeps the logo and the print setup on a generated tab.
   * Relationships that must stay unique but have no meaning on a copy — comments,
   * VML, tables, OLE objects, form controls — are dropped, matching the elements
   * stripped from the sheet XML. Everything else (external links, images) is
   * shared, which is safe for those part types.
   */
  cloneSheetRels(sourcePath, newPath) {
    const relsOf = (p) => p.replace(/([^/]+)$/, '_rels/$1.rels');
    const sourceRels = relsOf(sourcePath);
    if (!this.entries[sourceRels]) return;

    const OWNED = {
      drawing: { dir: 'xl/drawings', ext: 'xml' },
      printerSettings: { dir: 'xl/printerSettings', ext: 'bin' },
    };

    const rels = this.text(sourceRels).replace(
      /<Relationship\b[^>]*?\/>|<Relationship\b[\s\S]*?<\/Relationship>/g,
      (tag) => {
        const type = getAttr(tag, 'Type') || '';
        if (/\/(comments|table|oleObject|control|ctrlProp|vmlDrawing)$/.test(type)) return '';

        const owned = OWNED[type.split('/').pop()];
        if (!owned) return tag;

        const target = getAttr(tag, 'Target') || '';
        if (!target || getAttr(tag, 'TargetMode') === 'External') return tag;

        const absolute = resolvePartPath('xl/worksheets', target);
        if (!this.entries[absolute]) return '';
        const copied = this.copyPart(absolute, owned.dir, owned.ext);
        return tag.replace(/Target="[^"]*"/, `Target="../${copied.replace(/^xl\//, '')}"`);
      },
    );
    this.writeText(relsOf(newPath), rels);
  }

  /**
   * Copies an existing worksheet into a brand new tab.
   *
   * The copy keeps the blueprint's columns, formulas, styles, merges, row geometry,
   * print setup and drawings, which is what makes a generated department block look
   * and print exactly like a hand-made one.
   *
   * @param {string} sourceName sheet to copy
   * @param {string} newName tab name for the copy
   * @param {Object.<string,string>} [renameRefs] old sheet name -> new sheet name,
   *        applied to formulas inside the copy so it points at its own trio
   * @returns {boolean} false when a sheet with that name already exists
   */
  cloneSheet(sourceName, newName, renameRefs) {
    if (this.sheetPaths.has(newName)) return false;
    const sourcePath = this.sheetPaths.get(sourceName);
    if (!sourcePath) throw new Error(`No such sheet: ${sourceName}`);

    let xml = this.text(sourcePath);
    xml = xml
      .replace(/<legacyDrawing\b[^>]*\/>/g, '')
      .replace(/<legacyDrawingHF\b[^>]*\/>/g, '')
      .replace(/<oleObjects\b[\s\S]*?<\/oleObjects>/g, '')
      .replace(/<controls\b[\s\S]*?<\/controls>/g, '')
      .replace(/<tableParts\b[\s\S]*?<\/tableParts>/g, '')
      .replace(/<tableParts\b[^>]*\/>/g, '');

    for (const [from, to] of Object.entries(renameRefs || {})) {
      xml = retargetSheetRef(xml, from, to);
    }

    const newPath = this.nextGeneratedPath('xl/worksheets', 'xml');
    this.writeText(newPath, xml);
    this.cloneSheetRels(sourcePath, newPath);

    const wbPath = 'xl/workbook.xml';
    let wb = this.text(wbPath);
    let maxSheetId = 0;
    for (const m of wb.matchAll(/<sheet\b[^>]*\bsheetId="(\d+)"/g)) {
      maxSheetId = Math.max(maxSheetId, Number(m[1]));
    }

    const relsPath = 'xl/_rels/workbook.xml.rels';
    let rels = this.text(relsPath);
    let ridIndex = 1;
    let rid = `rIdA33Gen${ridIndex}`;
    while (rels.includes(`"${rid}"`)) {
      ridIndex += 1;
      rid = `rIdA33Gen${ridIndex}`;
    }

    rels = rels.replace(
      '</Relationships>',
      `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${newPath.replace(/^xl\//, '')}"/></Relationships>`,
    );
    this.writeText(relsPath, rels);

    wb = wb.replace(
      '</sheets>',
      `<sheet name="${escapeXml(newName)}" sheetId="${maxSheetId + 1}" r:id="${rid}"/></sheets>`,
    );
    this.writeText(wbPath, wb);

    const ctPath = '[Content_Types].xml';
    if (this.entries[ctPath]) {
      const ct = this.text(ctPath).replace(
        '</Types>',
        `<Override PartName="/${newPath}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      );
      this.writeText(ctPath, ct);
    }

    this.sheetPaths = this.readSheetIndex();
    this.cloneDefinedNames(sourceName, newName);
    return true;
  }

  /**
   * Copies Print_Area / Print_Titles (and any other sheet-local defined names)
   * onto the new tab. Without this the cloned sheet has no print range, so Excel
   * paginates the whole grid, the "Sheet X of 3 Sheet/s" header counts extra
   * pages, and the repeating title rows no longer stay put.
   */
  cloneDefinedNames(sourceName, newName) {
    const wbPath = 'xl/workbook.xml';
    let wb = this.text(wbPath);
    if (!/<definedNames>/.test(wb)) return;

    const order = [...wb.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)].map((m) => m[1]);
    const fromId = order.indexOf(sourceName);
    const toId = order.indexOf(newName);
    if (fromId < 0 || toId < 0) return;

    const extra = [];
    const re = /<definedName\b([^>]*)>([\s\S]*?)<\/definedName>/g;
    let m;
    while ((m = re.exec(wb)) !== null) {
      const sid = getAttr(m[1], 'localSheetId');
      if (sid !== String(fromId)) continue;
      const newAttrs = setAttr(m[1], 'localSheetId', String(toId));
      const newBody = retargetSheetRef(m[2], sourceName, newName);
      extra.push(`<definedName${newAttrs}>${newBody}</definedName>`);
    }
    if (!extra.length) return;
    wb = wb.replace('</definedNames>', `${extra.join('')}</definedNames>`);
    this.writeText(wbPath, wb);
  }

  /**
   * Leaves only the named worksheet tabs visible. Every other sheet is set to
   * veryHidden so Excel still has the parts (no repair dialog) but the tab bar
   * only shows the sheets the user asked for.
   *
   * Prefer this over deleting sheets: SUMMARY formulas, defined names and
   * drawings all stay valid.
   *
   * @param {string[]} keepNames
   */
  showOnlySheets(keepNames) {
    const keep = new Set(keepNames);
    const missing = [...keep].filter((name) => !this.sheetPaths.has(name));
    if (missing.length) {
      throw new Error(`Cannot keep missing sheets: ${missing.join(', ')}`);
    }

    const wbPath = 'xl/workbook.xml';
    let wb = this.text(wbPath);
    wb = wb.replace(/<sheet\b[^>]*\/>/g, (tag) => {
      const name = getAttr(tag, 'name');
      if (!name) return tag;
      if (keep.has(name)) {
        return tag.replace(/\sstate="[^"]*"/, '');
      }
      if (/\sstate="/.test(tag)) {
        return tag.replace(/\sstate="[^"]*"/, ' state="veryHidden"');
      }
      return tag.replace(/\s*\/>$/, ' state="veryHidden"/>');
    });
    this.writeText(wbPath, wb);
  }

  /**
   * @deprecated Prefer showOnlySheets — deleting worksheet parts breaks Excel
   * recovery for this macro workbook (defined names, calc chain, drawings).
   */
  keepOnlySheets(keepNames) {
    this.showOnlySheets(keepNames);
  }

  /**
   * Makes Excel recalculate the whole workbook the moment the file is opened,
   * which is what replaces a server-side calculation engine.
   *
   * Also drops xl/calcChain.xml: we rewrite/clear many formulas, so the cached
   * calculation chain from the template no longer matches and Excel would open
   * a repair dialog for it.
   */
  setFullCalcOnLoad() {
    const path = 'xl/workbook.xml';
    let wb = this.text(path);
    if (/<calcPr\b[^>]*>/.test(wb)) {
      wb = wb.replace(/<calcPr\b([^>]*?)\/>/, (full, attrs) => {
        const cleaned = attrs.replace(/\s(fullCalcOnLoad|forceFullCalc)="[^"]*"/g, '');
        return `<calcPr${cleaned} fullCalcOnLoad="1"/>`;
      });
    } else {
      wb = wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
    }
    this.writeText(path, wb);
    this.dropCalcChain();
  }

  /** Removes the stale calculation chain so Excel rebuilds it on open. */
  dropCalcChain() {
    const calcPath = 'xl/calcChain.xml';
    if (this.entries[calcPath]) delete this.entries[calcPath];

    const relsPath = 'xl/_rels/workbook.xml.rels';
    if (this.entries[relsPath]) {
      let rels = this.text(relsPath);
      rels = rels.replace(
        /<Relationship\b[^>]*Type="[^"]*\/calcChain"[^>]*\/>/g,
        '',
      );
      rels = rels.replace(
        /<Relationship\b[^>]*Target="[^"]*calcChain\.xml"[^>]*\/>/g,
        '',
      );
      this.writeText(relsPath, rels);
    }

    const ctPath = '[Content_Types].xml';
    if (this.entries[ctPath]) {
      let ct = this.text(ctPath);
      ct = ct.replace(
        /<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g,
        '',
      );
      this.writeText(ctPath, ct);
    }
  }

  /** @returns {Buffer} the repacked .xlsm */
  toBuffer() {
    for (const [name, sheet] of this.sheets) {
      this.writeText(this.sheetPaths.get(name), sheet.toXml());
    }
    // Always strip calcChain on save — any formula rewrite invalidates it.
    this.dropCalcChain();
    return Buffer.from(zipSync(this.entries, { level: 6 }));
  }
}

module.exports = { XlsmPackage, Sheet, Row, Cell, escapeXml, unescapeXml };
