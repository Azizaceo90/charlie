"use client";

import { useMemo, useRef, useState } from "react";
import { FileText, Search, Trash2, Upload } from "lucide-react";
import { useData } from "@/lib/store";
import { SopDoc } from "@/lib/types";
import { Card, EmptyState, Modal, PageHeader } from "@/components/ui";
import PdfViewer from "@/components/PdfViewer";
import { ago } from "@/lib/format";

export default function SopsPage() {
  const { currentUser, sops, addSop, removeSop } = useData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(sops.map((s) => s.category)))],
    [sops]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sops
      .filter((s) => category === "All" || s.category === category)
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      )
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  }, [sops, query, category]);

  const selected = sops.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  async function remove(id: string) {
    await removeSop(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div>
      <PageHeader
        title="SOPs"
        subtitle="Standard operating procedures — upload PDFs and read them right here."
        actions={
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" /> Upload PDF
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <div>
          <Card className="mb-4 p-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                className="input pl-9"
                placeholder="Search SOPs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    category === c
                      ? "bg-brand text-white"
                      : "bg-bg-soft text-neutral-500 hover:bg-bg-hover"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No SOPs found"
              hint="Upload a PDF to get started."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`card flex w-full items-center gap-3 p-3 text-left transition-colors ${
                    selected?.id === s.id
                      ? "border-brand-soft bg-bg-hover"
                      : "hover:bg-bg-hover"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-purple/15 text-accent-purple">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-neutral-900">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {s.category} · {ago(s.uploadedAt)}
                    </div>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(s.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        remove(s.id);
                      }
                    }}
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-bg-card hover:text-accent-red"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {selected ? (
            <Card className="p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-neutral-900">
                  {selected.title}
                </div>
                <div className="text-xs text-neutral-500">
                  {selected.category} · Uploaded by {selected.uploadedBy} ·{" "}
                  {ago(selected.uploadedAt)}
                </div>
              </div>
              <PdfViewer
                dataUrl={selected.dataUrl}
                fileName={selected.fileName}
                height={640}
              />
            </Card>
          ) : (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="Select a SOP to read it here"
              hint="Documents open inside the dashboard — no downloads needed."
            />
          )}
        </div>
      </div>

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        uploadedBy={currentUser?.name ?? "Unknown"}
        existingCategories={categories.filter((c) => c !== "All")}
        onAdd={async (input) => {
          const created = await addSop(input);
          setSelectedId(created.id);
        }}
      />
    </div>
  );
}

function UploadModal({
  open,
  onClose,
  uploadedBy,
  existingCategories,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  uploadedBy: string;
  existingCategories: string[];
  onAdd: (input: Omit<SopDoc, "id">) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(existingCategories[0] ?? "General");
  const [fileName, setFileName] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setTitle("");
    setFileName("");
    setDataUrl("");
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("File is larger than 8 MB.");
      return;
    }
    setError("");
    setFileName(file.name);
    if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!dataUrl || !title.trim()) {
      setError("Add a title and choose a PDF.");
      return;
    }
    await onAdd({
      title: title.trim(),
      category: category.trim() || "General",
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      fileName: fileName || `${title}.pdf`,
      dataUrl,
      sizeKb: Math.round(dataUrl.length / 1024),
    });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Upload SOP"
    >
      <div className="space-y-4">
        <div>
          <label className="label">PDF file</label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={onFile}
            className="block w-full text-sm text-neutral-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dim"
          />
          {fileName && (
            <p className="mt-1.5 text-xs text-accent-green">Loaded {fileName}</p>
          )}
        </div>
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Refund Handling SOP"
          />
        </div>
        <div>
          <label className="label">Category</label>
          <input
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="sop-categories"
            placeholder="e.g. Operations"
          />
          <datalist id="sop-categories">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        {error && <p className="text-xs text-accent-red">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="btn-ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Upload
          </button>
        </div>
      </div>
    </Modal>
  );
}
