// Minimal, dependency-free PDF generator used to produce viewable sample
// documents (SOPs, contracts) so the in-dashboard PDF viewer works out of the
// box. Real user uploads are read directly as base64 data URLs instead.

function escapePdfText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function toBase64(s: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(s, "latin1").toString("base64");
  }
  return btoa(s);
}

/** Builds a single-page PDF (Letter size) with a title and body lines. */
export function makeSamplePdf(title: string, body: string[]): string {
  let content = `BT /F1 22 Tf 1 0 0 1 72 760 Tm (${escapePdfText(title)}) Tj ET\n`;
  let y = 720;
  for (const line of body) {
    content += `BT /F1 11 Tf 1 0 0 1 72 ${y} Tm (${escapePdfText(line)}) Tj ET\n`;
    y -= 18;
    if (y < 60) break;
  }

  const objects: string[] = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return `data:application/pdf;base64,${toBase64(pdf)}`;
}
