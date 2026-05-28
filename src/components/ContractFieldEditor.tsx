"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ContractField } from "@/lib/types";
import { loadPdfPages, PageRenderInfo } from "@/lib/pdfRender";

interface ToolDef {
  type: ContractField["type"];
  label: string;
  w: number;
  h: number;
}

const TOOLS: ToolDef[] = [
  { type: "name", label: "Name", w: 200, h: 28 },
  { type: "date", label: "Date", w: 120, h: 28 },
  { type: "email", label: "Email", w: 220, h: 28 },
  { type: "address", label: "Address", w: 280, h: 28 },
  { type: "phone", label: "Phone", w: 160, h: 28 },
  { type: "country", label: "Country", w: 160, h: 28 },
  { type: "signature", label: "Signature", w: 200, h: 70 },
];

export default function ContractFieldEditor({
  pdfDataUrl,
  value,
  onChange,
}: {
  pdfDataUrl: string;
  value: ContractField[];
  onChange: (fields: ContractField[]) => void;
}) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [pages, setPages] = useState<PageRenderInfo[]>([]);
  const [tool, setTool] = useState<ContractField["type"] | null>(null);

  useEffect(() => {
    let active = true;
    loadPdfPages(pdfDataUrl, 1.4).then((p) => {
      if (active) setPages(p);
    });
    return () => {
      active = false;
    };
  }, [pdfDataUrl]);

  useEffect(() => {
    pages.forEach((p, idx) => {
      const c = canvasRefs.current[idx];
      if (c) p.render(c).catch(() => {});
    });
  }, [pages]);

  function placeOnPage(pageNum: number, e: React.MouseEvent) {
    if (!tool) return;
    const idx = pageNum - 1;
    const pageDim = pages[idx];
    const pageEl = pageRefs.current[idx];
    if (!pageDim || !pageEl) return;
    const t = TOOLS.find((x) => x.type === tool)!;
    const rect = pageEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const f: ContractField = {
      id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: tool,
      page: pageNum,
      xRatio: Math.max(0, Math.min(1 - t.w / pageDim.width, x / pageDim.width)),
      yRatio: Math.max(0, Math.min(1 - t.h / pageDim.height, y / pageDim.height)),
      wRatio: t.w / pageDim.width,
      hRatio: t.h / pageDim.height,
    };
    onChange([...value, f]);
    setTool(null);
  }

  function dragStart(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const field = value.find((f) => f.id === id);
    if (!field) return;
    const pageDim = pages[field.page - 1];
    if (!pageDim) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = field.xRatio;
    const initY = field.yRatio;
    function move(ev: MouseEvent) {
      const dx = (ev.clientX - startX) / pageDim.width;
      const dy = (ev.clientY - startY) / pageDim.height;
      onChange(
        value.map((f) =>
          f.id === id
            ? {
                ...f,
                xRatio: Math.max(0, Math.min(1 - f.wRatio, initX + dx)),
                yRatio: Math.max(0, Math.min(1 - f.hRatio, initY + dy)),
              }
            : f
        )
      );
    }
    function end() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", end);
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", end);
  }

  function remove(id: string) {
    onChange(value.filter((f) => f.id !== id));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">
          Pick a field type then click on a page to place it.
        </span>
        <div className="flex flex-wrap gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setTool(tool === t.type ? null : t.type)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                tool === t.type
                  ? "bg-brand text-white"
                  : "border border-line bg-bg-soft text-neutral-700 hover:bg-bg-hover"
              }`}
            >
              + {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[70vh] space-y-2 overflow-auto rounded-lg border border-line bg-bg-soft p-2">
        {pages.length === 0 && (
          <div className="py-10 text-center text-xs text-neutral-400">
            Loading document…
          </div>
        )}
        {pages.map((p, idx) => (
          <div
            key={p.page}
            ref={(el) => {
              pageRefs.current[idx] = el;
            }}
            onClick={(e) => placeOnPage(p.page, e)}
            className={`relative inline-block bg-white shadow-sm ${
              tool ? "cursor-crosshair" : "cursor-default"
            }`}
            style={{ width: p.width, height: p.height }}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[idx] = el;
              }}
              className="block"
            />
            {value
              .filter((f) => f.page === p.page)
              .map((f) => (
                <div
                  key={f.id}
                  onMouseDown={(e) => dragStart(f.id, e)}
                  className="absolute cursor-move rounded border-2 border-dashed border-brand bg-brand/15 text-[10px] font-semibold uppercase tracking-wider text-brand"
                  style={{
                    left: f.xRatio * p.width,
                    top: f.yRatio * p.height,
                    width: f.wRatio * p.width,
                    height: f.hRatio * p.height,
                  }}
                >
                  <div className="flex items-center justify-between gap-1 px-1 pt-0.5">
                    <span>{f.type}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(f.id);
                      }}
                      className="text-brand hover:text-accent-red"
                      title="Remove field"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            <div className="absolute right-2 top-2 rounded bg-neutral-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              Page {p.page} / {pages.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
