"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, PenTool, Star, Type } from "lucide-react";

type Mode = "draw" | "type" | "saved";

const TYPE_FONTS: { label: string; stack: string }[] = [
  { label: "Casual", stack: '"Brush Script MT", "Segoe Script", cursive' },
  { label: "Formal", stack: '"Snell Roundhand", "Apple Chancery", cursive' },
  { label: "Simple", stack: '"Segoe Script", "Comic Sans MS", cursive' },
];

/** Render typed text as a signature PNG data URL. */
function renderTypedSignature(text: string, fontStack: string): string | null {
  if (!text.trim()) return null;
  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  const width = 600;
  const height = 160;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 64;
  ctx.font = `${size}px ${fontStack}`;
  // Shrink to fit the canvas width.
  while (size > 18 && ctx.measureText(text).width > width - 40) {
    size -= 2;
    ctx.font = `${size}px ${fontStack}`;
  }
  ctx.fillText(text, width / 2, height / 2);
  return canvas.toDataURL("image/png");
}

export default function SignaturePad({
  onChange,
  savedSignature,
  onSaveSignature,
  defaultName = "",
}: {
  onChange: (dataUrl: string | null) => void;
  /** A previously saved signature the user can drop in with one click. */
  savedSignature?: string | null;
  /** When provided, shows a "Save as my signature" action. */
  onSaveSignature?: (dataUrl: string) => void | Promise<void>;
  /** Prefilled name for the "type" mode. */
  defaultName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [mode, setMode] = useState<Mode>(savedSignature ? "saved" : "draw");
  const [typed, setTyped] = useState(defaultName);
  const [font, setFont] = useState(TYPE_FONTS[0].stack);
  const [current, setCurrent] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function emit(dataUrl: string | null) {
    setCurrent(dataUrl);
    setSaved(false);
    onChange(dataUrl);
  }

  // Set up the drawing canvas whenever we switch into draw mode.
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
    }
    setHasInk(false);
  }, [mode]);

  // Keep the typed signature in sync as the user types / changes font.
  useEffect(() => {
    if (mode !== "type") return;
    emit(renderTypedSignature(typed, font));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, typed, font]);

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent) {
    drawing.current = true;
    last.current = pos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasInk) emit(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasInk(false);
      emit(null);
    }
  }

  function useSaved() {
    if (savedSignature) {
      setCurrent(savedSignature);
      setSaved(false);
      onChange(savedSignature);
    }
  }

  // Re-apply the saved signature whenever the "saved" tab is active.
  useEffect(() => {
    if (mode === "saved" && savedSignature) useSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function save() {
    if (!current || !onSaveSignature) return;
    await onSaveSignature(current);
    setSaved(true);
  }

  const tab = (m: Mode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
        mode === m
          ? "bg-brand text-white"
          : "border border-line bg-bg-soft text-neutral-700 hover:bg-bg-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {savedSignature && tab("saved", "My signature", <Star className="h-3.5 w-3.5" />)}
        {tab("draw", "Draw", <PenTool className="h-3.5 w-3.5" />)}
        {tab("type", "Type", <Type className="h-3.5 w-3.5" />)}
      </div>

      {mode === "draw" && (
        <div className="relative overflow-hidden rounded-lg border border-line bg-white">
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-40 w-full touch-none"
          />
          {!hasInk && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
              Sign here
            </div>
          )}
        </div>
      )}

      {mode === "type" && (
        <div className="space-y-2">
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your full name"
          />
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FONTS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setFont(f.stack)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  font === f.stack
                    ? "border border-brand bg-brand/10 text-brand"
                    : "border border-line bg-bg-soft text-neutral-700 hover:bg-bg-hover"
                }`}
                style={{ fontFamily: f.stack }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border border-line bg-white px-3">
            {typed.trim() ? (
              <span
                className="truncate text-4xl text-neutral-900"
                style={{ fontFamily: font }}
              >
                {typed}
              </span>
            ) : (
              <span className="text-sm text-neutral-400">Preview</span>
            )}
          </div>
        </div>
      )}

      {mode === "saved" && (
        <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
          {savedSignature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={savedSignature}
              alt="Saved signature"
              className="max-h-32 max-w-full object-contain"
            />
          ) : (
            <span className="text-sm text-neutral-400">
              No saved signature yet.
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onSaveSignature && current && mode !== "saved" && (
            <button
              type="button"
              onClick={save}
              className="btn-subtle text-xs"
              title="Save this as your reusable signature"
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5 text-accent-green" /> Saved
                </>
              ) : (
                <>
                  <Star className="h-3.5 w-3.5" /> Save as my signature
                </>
              )}
            </button>
          )}
        </div>
        {mode === "draw" && (
          <button type="button" onClick={clear} className="btn-subtle text-xs">
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
