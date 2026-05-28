"use client";

/** Decode a base64 data URL into raw bytes for pdfjs. */
export function base64ToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let workerSrcSet = false;

/** Render the first page of a PDF data URL onto a canvas. Returns the rendered pixel dimensions. */
export async function renderFirstPage(
  canvas: HTMLCanvasElement,
  pdfDataUrl: string,
  scale = 1.5
): Promise<{ w: number; h: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import("pdfjs-dist");
  if (!workerSrcSet) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    workerSrcSet = true;
  }
  const doc = await pdfjs.getDocument({ data: base64ToBytes(pdfDataUrl) }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
  return { w: viewport.width, h: viewport.height };
}
