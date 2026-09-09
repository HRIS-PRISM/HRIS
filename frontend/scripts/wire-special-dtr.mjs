const fs = require('fs');
const path = require('path');

const dir = path.join(
  'c:',
  'Users',
  'Admin',
  'OneDrive',
  'Desktop',
  'HRIS_ADVANCE',
  'HRIS',
  'frontend',
  'src',
  'components',
  'ATTENDANCE',
);

const configs = [
  { file: 'DailyTimeRecordHonorarium.jsx', dtrType: 'honorarium' },
  { file: 'DailyTimeRecordServiceCredits.jsx', dtrType: 'service-credit' },
  { file: 'DailyTimeRecordOvertime.jsx', dtrType: 'overtime' },
];

for (const cfg of configs) {
  const p = path.join(dir, cfg.file);
  let s = fs.readFileSync(p, 'utf8');

  s = s.replace(/import \{ jsPDF \} from 'jspdf';\r?\n/, '');
  s = s.replace(/import html2canvas from 'html2canvas';\r?\n/, '');
  s = s.replace(
    /import \{\s*formatDtrPdfFileName,\s*openPdfBlobForPrint,\s*\} from '\.\.\/\.\.\/utils\/dtrFormatHelpers';\r?\n/,
    '',
  );

  if (!s.includes("from './DTRTemplate'")) {
    s = s.replace(
      /} from '\.\/attendanceFilterLayout';/,
      `} from './attendanceFilterLayout';
import DTRTemplate from './DTRTemplate';
import { DTRPrintStyles, printDtrHtml } from './DailyTimeRecordPrintable';`,
    );
  }

  s = s.replace(
    /\/\*\* html2canvas often under-renders[\s\S]*?^};\r?\n\r?\n(?=\/\/ ─── COMPONENT)/m,
    '',
  );

  s = s.replace(
    /\/\/ ── Capture helpers ─+[\s\S]*?const downloadPDF = async \(\) => \{[\s\S]*?\n  \};/,
    `const printPage = async () => {
    if (!dtrRef.current) return;
    await printDtrHtml(dtrRef.current);
  };

  const downloadPDF = async () => {
    if (!dtrRef.current) return;
    await printDtrHtml(dtrRef.current);
  };`,
  );

  s = s.replace(/<style>\{\`[\s\S]*?\`\}<\/style>/, '<DTRPrintStyles />');

  const tableRe =
    /<div\s+className="table-container"\s+ref=\{dtrRef\}>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
  const replacement = `<div className="table-container" ref={dtrRef}>
                                  <div className="table-wrapper">
                                    <DTRTemplate
                                      employeeName={employeeName}
                                      records={records}
                                      officialTime={officialTimes}
                                      startDate={startDate}
                                      endDate={endDate}
                                      selectedYear={selectedYear}
                                      selectedMonth={selectedMonth}
                                      holidays={holidays}
                                      suspensions={suspensions}
                                      approvedLeaves={[]}
                                      formatTime={formatTime}
                                      keyPrefix="screen"
                                      dtrType="${cfg.dtrType}"
                                    />
                                  </div>
                                </div>`;

  if (!tableRe.test(s)) {
    console.error('table markup not found in', cfg.file);
  } else {
    s = s.replace(tableRe, replacement);
  }

  s = s.replace(
    /Download generates a PDF of your [^<]+/,
    "Download opens your browser's print dialog — choose \"Save as PDF\" for ",
  );

  if (!s.includes('dtr-print-area')) {
    s = s.replace(
      /(<Box\s*\n\s*sx=\{\{\s*\n\s*bgcolor: '#f4f0f0')/,
      '<Box\n                              className="dtr-print-area"\n                              sx={{\n                                bgcolor: \'#f4f0f0\'',
    );
  }

  fs.writeFileSync(p, s);
  console.log('updated', cfg.file, 'len', s.length);
}
