import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Embeds the drawn signature image, signer name and date into the bottom of the
 * last page of a contract PDF. Returns a new base64 data URL. If the source PDF
 * can't be parsed, returns the original unchanged (signing still proceeds).
 */
export async function stampSignature(
  pdfDataUrl: string,
  signatureDataUrl: string,
  signerName: string
): Promise<string> {
  try {
    const pdfBytes = Buffer.from(pdfDataUrl.split(",")[1] ?? "", "base64");
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = pdf.getPages();
    const page = pages[pages.length - 1];
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    const b64 = signatureDataUrl.split(",")[1] ?? "";
    const imgBytes = Buffer.from(b64, "base64");
    const sigImg = signatureDataUrl.includes("image/png")
      ? await pdf.embedPng(imgBytes)
      : await pdf.embedJpg(imgBytes);

    const sigW = 150;
    const sigH = (sigImg.height / sigImg.width) * sigW;
    const x = 60;
    const y = 70;

    page.drawText("Signed by:", {
      x,
      y: y + sigH + 6,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.4),
    });
    page.drawImage(sigImg, { x, y, width: sigW, height: sigH });
    page.drawLine({
      start: { x, y: y - 4 },
      end: { x: x + sigW, y: y - 4 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.75),
    });
    page.drawText(`${signerName} — ${new Date().toLocaleString()}`, {
      x,
      y: y - 16,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.25),
    });

    const out = await pdf.save();
    return `data:application/pdf;base64,${Buffer.from(out).toString("base64")}`;
  } catch {
    return pdfDataUrl;
  }
}
