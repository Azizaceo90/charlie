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

export interface PageRenderInfo {
  page: number;
  width: number;
  height: number;
  render: (canvas: HTMLCanvasElement) => Promise<void>;
}

/** Loads every page of a PDF data URL, returning info + a render function per page. */
export async function loadPdfPages(
  pdfDataUrl: string,
  scale = 1.4
): Promise<PageRenderInfo[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import("pdfjs-dist");
  if (!workerSrcSet) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    workerSrcSet = true;
  }
  const doc = await pdfjs.getDocument({ data: base64ToBytes(pdfDataUrl) }).promise;
  const out: PageRenderInfo[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    out.push({
      page: i,
      width: viewport.width,
      height: viewport.height,
      render: async (canvas: HTMLCanvasElement) => {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;
      },
    });
  }
  return out;
}

/** Backwards-compatible helper for single-page rendering. */
export async function renderFirstPage(
  canvas: HTMLCanvasElement,
  pdfDataUrl: string,
  scale = 1.5
): Promise<{ w: number; h: number }> {
  const pages = await loadPdfPages(pdfDataUrl, scale);
  if (pages.length === 0) return { w: 0, h: 0 };
  await pages[0].render(canvas);
  return { w: pages[0].width, h: pages[0].height };
}
