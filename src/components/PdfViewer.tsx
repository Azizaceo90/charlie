"use client";

import { Download, ExternalLink } from "lucide-react";

export default function PdfViewer({
  dataUrl,
  fileName,
  height = 560,
}: {
  dataUrl: string;
  fileName?: string;
  height?: number;
}) {
  function openInTab() {
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${dataUrl}" style="border:0;width:100%;height:100vh"></iframe>`
      );
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-bg-soft">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="truncate text-xs text-slate-400">
          {fileName ?? "document.pdf"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={openInTab}
            className="rounded-md p-1.5 text-slate-400 hover:bg-bg-hover hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <a
            href={dataUrl}
            download={fileName ?? "document.pdf"}
            className="rounded-md p-1.5 text-slate-400 hover:bg-bg-hover hover:text-white"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>
      <iframe
        src={dataUrl}
        title={fileName ?? "PDF document"}
        className="w-full bg-white"
        style={{ height }}
      />
    </div>
  );
}
