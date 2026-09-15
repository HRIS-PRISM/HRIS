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
export const downloadStyledExcel = ({
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
