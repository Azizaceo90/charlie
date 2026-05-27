"use client";

import { RANGE_OPTIONS, RangeKey } from "@/lib/dateRange";

export default function RangeFilter({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-bg-soft p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.key
              ? "bg-brand text-white"
              : "text-neutral-500 hover:bg-bg-hover hover:text-neutral-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
