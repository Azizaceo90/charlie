"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "brand" | "green" | "amber" | "blue" | "purple" | "red" | "teal";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand text-white",
    green: "bg-accent-green text-white",
    amber: "bg-accent-amber text-white",
    blue: "bg-accent-blue text-white",
    purple: "bg-accent-purple text-white",
    red: "bg-accent-red text-white",
    teal: "bg-accent-teal text-white",
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-neutral-500">{label}</div>
        {icon && (
          <div className={`rounded-lg p-2 ${tones[tone]}`}>{icon}</div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-neutral-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 text-neutral-400">{icon}</div>}
      <div className="text-sm font-medium text-neutral-700">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-xs text-neutral-500">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={`card my-8 w-full ${
          wide ? "max-w-4xl" : "max-w-lg"
        } overflow-hidden`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 hover:bg-bg-hover hover:text-neutral-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
