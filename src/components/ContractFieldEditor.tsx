"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ContractField } from "@/lib/types";
import { renderFirstPage } from "@/lib/pdfRender";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<ContractField["type"] | null>(null);
  const [dim, setDim] = useState({ w: 800, h: 1000 });

  useEffect(() => {
    if (!canvasRef.current) return;
    let active = true;
    renderFirstPage(canvasRef.current, pdfDataUrl, 1.4).then((d) => {
      if (active) setDim(d);
    });
    return () => {
      active = false;
    };
  }, [pdfDataUrl]);

  function handleCanvasClick(e: React.MouseEvent) {
    if (!tool || !wrapRef.current) return;
    const t = TOOLS.find((x) => x.type === tool)!;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const f: ContractField = {
      id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: tool,
      page: 1,
      xRatio: Math.max(0, Math.min(1 - t.w / dim.w, x / dim.w)),
      yRatio: Math.max(0, Math.min(1 - t.h / dim.h, y / dim.h)),
      wRatio: t.w / dim.w,
      hRatio: t.h / dim.h,
    };
    onChange([...value, f]);
    setTool(null);
  }

  function dragStart(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const field = value.find((f) => f.id === id);
    if (!field) return;
    const initX = field.xRatio;
    const initY = field.yRatio;
    function move(ev: MouseEvent) {
      const dx = (ev.clientX - startX) / dim.w;
      const dy = (ev.clientY - startY) / dim.h;
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
          Click a field type then click on the document to place it.
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
      <div
        ref={wrapRef}
        onClick={handleCanvasClick}
        className={`relative inline-block max-w-full rounded-lg border border-line bg-white ${
          tool ? "cursor-crosshair" : "cursor-default"
        }`}
      >
        <canvas ref={canvasRef} className="block max-w-full" />
        {value
          .filter((f) => f.page === 1)
          .map((f) => (
            <div
              key={f.id}
              onMouseDown={(e) => dragStart(f.id, e)}
              className="absolute cursor-move rounded border-2 border-dashed border-brand bg-brand/15 text-[10px] font-semibold uppercase tracking-wider text-brand"
              style={{
                left: f.xRatio * dim.w,
                top: f.yRatio * dim.h,
                width: f.wRatio * dim.w,
                height: f.hRatio * dim.h,
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
      </div>
    </div>
  );
}
