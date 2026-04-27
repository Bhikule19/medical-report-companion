import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPORT_TEXT = [
  ['PATIENT REPORT — SYNTHETIC TEST DATA', 18, true],
  ['', 12, false],
  ['Patient: John Doe   DOB: 1985-04-12', 11, false],
  ['Date: 2026-04-26   Lab: Acme Diagnostics', 11, false],
  ['', 12, false],
  ['COMPLETE BLOOD COUNT', 13, true],
  ['Haemoglobin: 13.5 g/dL    (Normal: 12.0-16.0)', 11, false],
  ['Platelets: 250,000 /uL    (Normal: 150,000-400,000)', 11, false],
  ['Leukocytes: 7,200 /uL     (Normal: 4,000-11,000)', 11, false],
  ['', 12, false],
  ['LIPID PANEL', 13, true],
  ['Cholesterol: 195 mg/dL    (Normal: <200)', 11, false],
  ['Triglycerides: 142 mg/dL  (Normal: <150)', 11, false],
  ['', 12, false],
  ['KIDNEY FUNCTION', 13, true],
  ['Creatinine: 0.9 mg/dL     (Normal: 0.6-1.2)', 11, false],
  ['', 12, false],
  ['DIABETES PANEL', 13, true],
  ['Glucose (fasting): 92 mg/dL  (Normal: 70-100)', 11, false],
  ['', 12, false],
  ['Disclaimer: This is synthetic test data. No real patient.', 9, false],
];

async function main() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  for (const [text, size, bold] of REPORT_TEXT) {
    page.drawText(text, {
      x: 50,
      y,
      size,
      font: bold ? helvBold : helv,
      color: rgb(0, 0, 0),
    });
    y -= size + 6;
  }

  const bytes = await pdf.save();
  const out = join(__dirname, 'digital-en.pdf');
  await writeFile(out, bytes);
  console.log(`Wrote ${out} (${bytes.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
