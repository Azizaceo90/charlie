"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "./SignaturePad";
import { ContractField } from "@/lib/types";
import { renderFirstPage } from "@/lib/pdfRender";

export default function ContractSignViewer({
  pdfDataUrl,
  fields,
  values,
  onChange,
}: {
  pdfDataUrl: string;
  fields: ContractField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
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

  function set(id: string, v: string) {
    onChange({ ...values, [id]: v });
  }

  return (
    <div
      ref={wrapRef}
      className="relative inline-block max-w-full rounded-lg border border-line bg-white"
    >
      <canvas ref={canvasRef} className="block max-w-full" />
      {fields
        .filter((f) => f.page === 1)
        .map((f) => {
          const style: React.CSSProperties = {
            left: f.xRatio * dim.w,
            top: f.yRatio * dim.h,
            width: f.wRatio * dim.w,
            height: f.hRatio * dim.h,
          };
          if (f.type === "signature") {
            return (
              <div key={f.id} className="absolute" style={style}>
                <div className="h-full w-full rounded border border-brand/40 bg-white">
                  <SignaturePad onChange={(d) => set(f.id, d ?? "")} />
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
              className="absolute rounded border border-brand/50 bg-white px-2 text-sm text-neutral-900 outline-none focus:border-brand"
              style={style}
              placeholder={placeholder}
              value={values[f.id] ?? ""}
              onChange={(e) => set(f.id, e.target.value)}
            />
          );
        })}
    </div>
  );
}
