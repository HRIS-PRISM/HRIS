const xmlEscape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r\n/g, '&#10;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#10;');

const estimateRowHeight = (row, columns) => {
  let lines = 1;
  columns.forEach((col) => {
    if (col.kind !== 'wrap') return;
    const text = String(row[col.key] ?? '');
    const explicit = text.split(/\n/).length;
    const widthChars = Math.max(18, Math.floor((col.width || 100) / 6));
    const wrapped = text
      .split(/\n/)
      .reduce(
        (sum, part) => sum + Math.max(1, Math.ceil(part.length / widthChars)),
        0,
      );
    lines = Math.max(lines, explicit, wrapped);
  });
  return Math.min(120, Math.max(20, 14 + lines * 14));
};

const actionKind = (action) => {
  const a = String(action || '').toUpperCase();
  if (['DELETE', 'REMOVE', 'DESTROY'].some((k) => a.includes(k))) return 'delete';
  if (['CREATE', 'ADD', 'INSERT', 'REGISTER'].some((k) => a.includes(k)))
    return 'create';
  if (['UPDATE', 'EDIT', 'MODIFY', 'CHANGE'].some((k) => a.includes(k)))
    return 'update';
  return '';
};

/**
 * Download a compact, HRIS-styled Excel report (SpreadsheetML .xls).
 * columns: [{ key, header, width, kind?: 'text' | 'mono' | 'action' | 'wrap' }]
 */
const downloadStyledSpreadsheetMl = ({
  filename,
  sheetName,
  title,
  subtitle = '',
  generatedAt,
  exportedBy,
  recordCount,
  filtersLabel = 'None',
  columns,
  rows,
}) => {
  const colCount = columns.length;
  const merge = colCount - 1;
  const headerRow = 3;
  const dataCount = Math.max(rows.length, 1);
  const lastRow = headerRow + dataCount;

  const columnXml = columns
    .map(
      (col) =>
        `<Column ss:AutoFitWidth="0" ss:Width="${col.width || 100}"/>`,
    )
    .join('');

  const banner = `
    <Row ss:Height="32">
      <Cell ss:MergeAcross="${merge}" ss:StyleID="Banner">
        <Data ss:Type="String">${xmlEscape(title)}</Data>
      </Cell>
    </Row>
    <Row ss:Height="20">
      <Cell ss:MergeAcross="${merge}" ss:StyleID="MetaBar">
        <Data ss:Type="String">${xmlEscape(
          [
            subtitle,
            `Generated ${generatedAt}`,
            `Exported by ${exportedBy}`,
            `${Number(recordCount || 0).toLocaleString()} record${
              recordCount === 1 ? '' : 's'
            }`,
            `Filters: ${filtersLabel}`,
          ]
            .filter(Boolean)
            .join('   ·   '),
        )}</Data>
      </Cell>
    </Row>`;

  const headerXml = `<Row ss:Height="24">${columns
    .map(
      (col) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(
          col.header,
        )}</Data></Cell>`,
    )
    .join('')}</Row>`;

  const dataXml =
    rows.length === 0
      ? `<Row ss:Height="24"><Cell ss:MergeAcross="${merge}" ss:StyleID="Empty"><Data ss:Type="String">No records matched the current filters.</Data></Cell></Row>`
      : rows
          .map((row, i) => {
            const zebra = i % 2 === 0 ? 'Even' : 'Odd';
            const height = estimateRowHeight(row, columns);
            return `<Row ss:Height="${height}" ss:AutoFitHeight="1">${columns
              .map((col) => {
                let style = zebra;
                if (col.kind === 'mono') style = `Mono${zebra}`;
                if (col.kind === 'wrap') style = `Wrap${zebra}`;
                if (col.kind === 'action') {
                  const kind = actionKind(row[col.key]);
                  if (kind === 'delete') style = 'ActionDelete';
                  else if (kind === 'create') style = 'ActionCreate';
                  else if (kind === 'update') style = 'ActionUpdate';
                  // Prefer short action labels for the action column style
                  else style = zebra;
                }
                return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEscape(
                  row[col.key] ?? '—',
                )}</Data></Cell>`;
              })
              .join('')}</Row>`;
          })
          .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${xmlEscape(title)}</Title>
  <Author>EARIST HRIS</Author>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1A1A1A"/>
  </Style>
  <Style ss:ID="Banner">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#6D2323" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaBar">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#6D2323"/>
   <Interior ss:Color="#F7EDED" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#5A1D1D" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Even">
   <Alignment ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1A1A1A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F0E4E4"/>
   </Borders>
  </Style>
  <Style ss:ID="Odd">
   <Alignment ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1A1A1A"/>
   <Interior ss:Color="#FBF8F8" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F0E4E4"/>
   </Borders>
  </Style>
  <Style ss:ID="MonoEven">
   <Alignment ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#5A5A5A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F0E4E4"/>
   </Borders>
  </Style>
  <Style ss:ID="MonoOdd">
   <Alignment ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#5A5A5A"/>
   <Interior ss:Color="#FBF8F8" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F0E4E4"/>
   </Borders>
  </Style>
  <Style ss:ID="WrapEven">
   <Alignment ss:Vertical="Top" ss:WrapText="1" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#4A4A4A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F0E4E4"/>
   </Borders>
  </Style>
  <Style ss:ID="WrapOdd">
   <Alignment ss:Vertical="Top" ss:WrapText="1" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#4A4A4A"/>
   <Interior ss:Color="#FBF8F8" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F0E4E4"/>
   </Borders>
  </Style>
  <Style ss:ID="ActionCreate">
   <Alignment ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#2E7D32"/>
   <Interior ss:Color="#E8F5E9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ActionUpdate">
   <Alignment ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1565C0"/>
   <Interior ss:Color="#E3F2FD" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ActionDelete">
   <Alignment ss:Vertical="Center" ss:Indent="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#C62828"/>
   <Interior ss:Color="#FFEBEE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Empty">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#A0A0A0"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(sheetName).slice(0, 31)}">
  <Names>
   <NamedRange ss:Name="_FilterDatabase" ss:RefersTo="='${xmlEscape(
     sheetName,
   ).slice(0, 31)}'!R${headerRow}C1:R${lastRow}C${colCount}" ss:Hidden="1"/>
  </Names>
  <Table ss:ExpandedColumnCount="${colCount}" ss:ExpandedRowCount="${lastRow}" x:FullColumns="1" x:FullRows="1">
   ${columnXml}
   ${banner}
   ${headerXml}
   ${dataXml}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Landscape"/>
    <Header x:Margin="0.2" x:Data="&amp;L&amp;8EARIST HRIS&amp;R&amp;8${xmlEscape(
      title,
    )}"/>
    <Footer x:Margin="0.2" x:Data="&amp;L&amp;8Confidential&amp;C&amp;8Page &amp;P of &amp;N&amp;R&amp;8${xmlEscape(
      generatedAt,
    )}"/>
    <PageMargins x:Bottom="0.5" x:Left="0.4" x:Right="0.4" x:Top="0.5"/>
   </PageSetup>
   <FitToPage/>
   <Print>
    <ValidPrinterInfo/>
    <PaperSizeIndex>9</PaperSizeIndex>
    <FitWidth>1</FitWidth>
    <FitHeight>0</FitHeight>
   </Print>
   <DoNotDisplayGridlines/>
  </WorksheetOptions>
  <AutoFilter x:Range="R${headerRow}C1:R${lastRow}C${colCount}" xmlns="urn:schemas-microsoft-com:office:excel"/>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([`\uFEFF${xml}`], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const concatBytes = (chunks) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
};

export const zipStore = (files) => {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (9 << 5) | 16;

  files.forEach((file) => {
    const name = enc.encode(file.name);
    const data = typeof file.data === 'string' ? enc.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  });

  const centralBytes = concatBytes(centrals);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralBytes.length, true);
  eocdView.setUint32(16, offset, true);
  return concatBytes([...locals, centralBytes, eocd]);
};

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

const safeSheetName = (name, used) => {
  const cleaned = String(name || 'Sheet')
    .replace(/[:\\/?*[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'Sheet';
  let next = cleaned;
  let i = 2;
  while (used.has(next.toLowerCase())) {
    const suffix = ` ${i}`;
    next = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  used.add(next.toLowerCase());
  return next;
};

const xmlText = (value) =>
  xmlEscape(String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''));

const XF = {
  banner: 1,
  meta: 2,
  header: 3,
  even: 4,
  odd: 5,
  monoEven: 6,
  monoOdd: 7,
  wrapEven: 8,
  wrapOdd: 9,
  create: 10,
  update: 11,
  delete: 12,
  empty: 13,
  numEven: 14,
  numOdd: 15,
  numAlert: 16,
  orange: 17,
};

const statusTone = (value) => {
  const text = String(value || '').toLowerCase();
  if (!text || text === '—' || text === '-') return '';
  if (text.includes('not sent')) return '';
  if (/(uncategor|deduct|unpaid|salary)/.test(text)) return 'delete';
  if (text.includes('break')) return 'orange';
  if (/(special|manual|in payroll)/.test(text)) return 'update';
  if (/(time in|time out|covered|leave|\bsent\b)/.test(text)) return 'create';
  return actionKind(text) || '';
};

const cellStyleId = (col, row, zebra) => {
  if (col.kind === 'mono') return zebra === 'Even' ? XF.monoEven : XF.monoOdd;
  if (col.kind === 'wrap') return zebra === 'Even' ? XF.wrapEven : XF.wrapOdd;
  if (col.kind === 'number' || col.kind === 'unpaid') {
    const n = Number(row[col.key]);
    if (col.kind === 'unpaid' && Number.isFinite(n) && n > 0) return XF.numAlert;
    return zebra === 'Even' ? XF.numEven : XF.numOdd;
  }
  if (col.kind === 'action' || col.kind === 'status') {
    const tone =
      col.kind === 'action' ? actionKind(row[col.key]) : statusTone(row[col.key]);
    if (tone === 'delete') return XF.delete;
    if (tone === 'create') return XF.create;
    if (tone === 'update') return XF.update;
    if (tone === 'orange') return XF.orange;
  }
  return zebra === 'Even' ? XF.even : XF.odd;
};

const isNumericKind = (kind) => kind === 'number' || kind === 'unpaid';

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="0.000"/>
  </numFmts>
  <fonts count="11">
    <font><sz val="10"/><color rgb="FF1A1A1A"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="9"/><color rgb="FF6D2323"/><name val="Calibri"/></font>
    <font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="9"/><color rgb="FF5A5A5A"/><name val="Consolas"/></font>
    <font><sz val="10"/><color rgb="FF4A4A4A"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF2E7D32"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF1565C0"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFC62828"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFE65100"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="12">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFBF8F8"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF6D2323"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7EDED"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF5A1D1D"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F5E9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE3F2FD"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFEBEE"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF6D2323"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF3E0"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left/><right/><top/>
      <bottom style="thin"><color rgb="FFF0E4E4"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="18">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="6" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1" indent="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1" indent="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="7" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="8" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
    <xf numFmtId="164" fontId="10" fillId="10" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="9" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
  </cellXfs>
</styleSheet>`;

const buildSheetXml = (sheet, generatedAt) => {
  const columns = sheet.columns || [];
  const rows = sheet.rows || [];
  const colCount = Math.max(columns.length, 1);
  const headerRow = 3;
  const dataCount = Math.max(rows.length, 1);
  const lastRow = headerRow + dataCount;
  const lastCol = colLetter(colCount);
  const merges = [`A1:${lastCol}1`, `A2:${lastCol}2`];
  if (rows.length === 0) merges.push(`A4:${lastCol}4`);

  const colsXml = columns
    .map((col, i) => {
      const width = Math.min(80, Math.max(8, Math.round((col.width || 100) / 7)));
      return `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`;
    })
    .join('');

  const bannerText = xmlText(sheet.title || 'EARIST HRIS');
  const metaText = xmlText(
    [
      sheet.subtitle,
      generatedAt ? `Generated ${generatedAt}` : '',
      sheet.exportedBy ? `Exported by ${sheet.exportedBy}` : '',
      `${Number(sheet.recordCount || 0).toLocaleString()} record${
        sheet.recordCount === 1 ? '' : 's'
      }`,
      `Filters: ${sheet.filtersLabel || 'None'}`,
    ]
      .filter(Boolean)
      .join('   ·   '),
  );

  const headerXml = columns
    .map(
      (col, i) =>
        `<c r="${colLetter(i + 1)}${headerRow}" s="${XF.header}" t="inlineStr"><is><t>${xmlText(
          col.header,
        )}</t></is></c>`,
    )
    .join('');

  const dataXml =
    rows.length === 0
      ? `<row r="4" ht="24" customHeight="1"><c r="A4" s="${XF.empty}" t="inlineStr"><is><t>No records matched the current filters.</t></is></c></row>`
      : rows
          .map((row, i) => {
            const zebra = i % 2 === 0 ? 'Even' : 'Odd';
            const height = estimateRowHeight(row, columns);
            const cells = columns
              .map((col, colIndex) => {
                const ref = `${colLetter(colIndex + 1)}${headerRow + 1 + i}`;
                const style = cellStyleId(col, row, zebra);
                if (isNumericKind(col.kind)) {
                  const n = Number(row[col.key]);
                  if (Number.isFinite(n)) {
                    return `<c r="${ref}" s="${style}"><v>${n}</v></c>`;
                  }
                }
                const text = row[col.key] == null || row[col.key] === '' ? '—' : row[col.key];
                return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlText(
                  text,
                )}</t></is></c>`;
              })
              .join('');
            return `<row r="${headerRow + 1 + i}" ht="${height}" customHeight="1">${cells}</row>`;
          })
          .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:${lastCol}${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${colsXml}</cols>
  <sheetData>
    <row r="1" ht="32" customHeight="1"><c r="A1" s="${XF.banner}" t="inlineStr"><is><t>${bannerText}</t></is></c></row>
    <row r="2" ht="20" customHeight="1"><c r="A2" s="${XF.meta}" t="inlineStr"><is><t>${metaText}</t></is></c></row>
    <row r="3" ht="24" customHeight="1">${headerXml}</row>
    ${dataXml}
  </sheetData>
  <autoFilter ref="A${headerRow}:${lastCol}${lastRow}"/>
  <mergeCells count="${merges.length}">
    ${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}
  </mergeCells>
  <pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
  <headerFooter>
    <oddHeader>&amp;L&amp;8EARIST HRIS&amp;R&amp;8${xmlText(sheet.title || '')}</oddHeader>
    <oddFooter>&amp;L&amp;8Confidential&amp;C&amp;8Page &amp;P of &amp;N&amp;R&amp;8${xmlText(
      generatedAt || '',
    )}</oddFooter>
  </headerFooter>
</worksheet>`;
};

const buildStyledXlsxBytes = ({
  filename,
  sheetName,
  title,
  subtitle = '',
  generatedAt,
  exportedBy,
  recordCount,
  filtersLabel = 'None',
  columns,
  rows,
  sheets,
}) => {
  const sheetDefs = (sheets?.length ? sheets : [{
    sheetName,
    title,
    subtitle,
    recordCount,
    filtersLabel,
    columns,
    rows,
  }]).map((sheet) => ({
    ...sheet,
    title: sheet.title || title,
    subtitle: sheet.subtitle ?? subtitle,
    exportedBy: sheet.exportedBy || exportedBy,
    filtersLabel: sheet.filtersLabel || filtersLabel,
    recordCount: sheet.recordCount ?? sheet.rows?.length ?? recordCount ?? 0,
  }));

  const usedNames = new Set();
  const namedSheets = sheetDefs.map((sheet, index) => ({
    ...sheet,
    sheetName: safeSheetName(sheet.sheetName || `Sheet ${index + 1}`, usedNames),
  }));

  const sheetFiles = namedSheets.map((sheet, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    data: buildSheetXml(sheet, generatedAt),
  }));

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${namedSheets
      .map(
        (sheet, index) =>
          `<sheet name="${xmlText(sheet.sheetName)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join('')}
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${namedSheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')}
  <Relationship Id="rId${namedSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${namedSheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  return {
    filename: String(filename || 'export').toLowerCase().endsWith('.xlsx')
      ? filename
      : `${filename || 'export'}.xlsx`,
    bytes: zipStore([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'xl/workbook.xml', data: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
      { name: 'xl/styles.xml', data: STYLES_XML },
      ...sheetFiles,
    ]),
  };
};

export const downloadBlob = (bytes, filename, type) => {
  const blob = new Blob([bytes], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Download a styled Excel workbook.
 * `.xlsx` is a real Office Open XML file with the HRIS report layout.
 * Other names keep the SpreadsheetML `.xls` export.
 * columns: [{ key, header, width, kind?: 'text' | 'mono' | 'wrap' | 'action' | 'status' | 'number' | 'unpaid' }]
 * sheets?: extra worksheets; each uses the same column/row shape.
 */
export const downloadStyledExcel = (opts) => {
  const wantsXlsx =
    opts?.format === 'xlsx' ||
    String(opts?.filename || '').toLowerCase().endsWith('.xlsx');
  if (wantsXlsx) {
    const built = buildStyledXlsxBytes(opts);
    downloadBlob(
      built.bytes,
      built.filename,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    return;
  }
  downloadStyledSpreadsheetMl(opts);
};

export const excelTimestamp = () =>
  new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const excelExporterName = (info) =>
  info?.fullName ||
  info?.username ||
  info?.employeeNumber ||
  info?.role ||
  'HRIS user';
