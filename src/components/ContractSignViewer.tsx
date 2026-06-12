"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "./SignaturePad";
import { ContractField } from "@/lib/types";
import { loadPdfPages, PageRenderInfo } from "@/lib/pdfRender";

export default function ContractSignViewer({
  pdfDataUrl,
  fields,
  values,
  onChange,
  savedSignature,
  onSaveSignature,
  defaultName,
}: {
  pdfDataUrl: string;
  fields: ContractField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  savedSignature?: string | null;
  onSaveSignature?: (dataUrl: string) => void | Promise<void>;
  defaultName?: string;
}) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [pages, setPages] = useState<PageRenderInfo[]>([]);

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

  function set(id: string, v: string) {
    onChange({ ...values, [id]: v });
  }

  return (
    <div className="max-h-[70vh] space-y-2 overflow-auto rounded-lg border border-line bg-bg-soft p-2">
      {pages.length === 0 && (
        <div className="py-10 text-center text-xs text-neutral-400">
          Loading document…
        </div>
      )}
      {pages.map((p, idx) => (
        <div
          key={p.page}
          className="relative inline-block bg-white shadow-sm"
          style={{ width: p.width, height: p.height }}
        >
          <canvas
            ref={(el) => {
              canvasRefs.current[idx] = el;
            }}
            className="block"
          />
          {fields
            .filter((f) => f.page === p.page)
            .map((f) => {
              const style: React.CSSProperties = {
                left: f.xRatio * p.width,
                top: f.yRatio * p.height,
                width: f.wRatio * p.width,
                height: f.hRatio * p.height,
              };
              if (f.type === "signature") {
                return (
                  <div
                    key={f.id}
                    className="absolute z-10"
                    style={{
                      left: f.xRatio * p.width,
                      top: f.yRatio * p.height,
                      width: Math.max(f.wRatio * p.width, 320),
                    }}
                  >
                    <div className="rounded-lg border border-brand/40 bg-white p-2 shadow-lg">
                      <SignaturePad
                        onChange={(d) => set(f.id, d ?? "")}
                        savedSignature={savedSignature}
                        onSaveSignature={onSaveSignature}
                        defaultName={defaultName}
                      />
                    </div>
                  </div>
                );
              }
              const placeholder =
                f.type === "date"
                  ? "MM/DD/YYYY"
                  : f.type === "email"
                    ? "you@example.com"
                    : f.type === "country"
                      ? "Country"
                      : f.type[0].toUpperCase() + f.type.slice(1);
              return (
                <input
                  key={f.id}
                  type={f.type === "email" ? "email" : "text"}
                  className="absolute rounded border border-brand/50 bg-white px-2 text-sm text-neutral-900 outline-none focus:border-brand"
                  style={style}
                  placeholder={placeholder}
                  value={values[f.id] ?? ""}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              );
            })}
        </div>
      ))}
    </div>
  );
}
