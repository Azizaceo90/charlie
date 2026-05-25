"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileSignature,
  PenLine,
  Plus,
  Clock,
} from "lucide-react";
import { useData } from "@/lib/store";
import { Contract } from "@/lib/types";
import { Card, EmptyState, Modal, PageHeader } from "@/components/ui";
import PdfViewer from "@/components/PdfViewer";
import SignaturePad from "@/components/SignaturePad";
import { ago, dateOnly } from "@/lib/format";

export default function ContractsPage() {
  const { currentUser, users, contracts, addContract, updateContract } =
    useData();
  const isAdmin = currentUser?.role === "admin";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showIssue, setShowIssue] = useState(false);

  const visible = useMemo(() => {
    const list = isAdmin
      ? contracts
      : contracts.filter((c) => c.assignedToId === currentUser?.id);
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
      return a.issuedAt < b.issuedAt ? 1 : -1;
    });
  }, [contracts, isAdmin, currentUser]);

  const selected =
    contracts.find((c) => c.id === selectedId) ?? visible[0] ?? null;

  const canSign =
    selected &&
    selected.status === "pending" &&
    selected.assignedToId === currentUser?.id;

  function sign(signatureDataUrl: string) {
    if (!selected || !currentUser) return;
    updateContract(selected.id, {
      status: "signed",
      signedAt: new Date().toISOString(),
      signatureDataUrl,
      signerName: currentUser.name,
    });
  }

  const pendingCount = visible.filter((c) => c.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle={
          isAdmin
            ? "Issue agreements and track who has signed."
            : "Review and sign your agreements."
        }
        actions={
          isAdmin ? (
            <button className="btn-primary" onClick={() => setShowIssue(true)}>
              <Plus className="h-4 w-4" /> Issue contract
            </button>
          ) : undefined
        }
      />

      {pendingCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-4 py-3 text-sm">
          <Clock className="h-5 w-5 text-accent-amber" />
          <span className="text-slate-200">
            {pendingCount} contract{pendingCount === 1 ? "" : "s"} awaiting
            signature.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2">
          {visible.length === 0 ? (
            <EmptyState
              icon={<FileSignature className="h-8 w-8" />}
              title="No contracts yet"
              hint={isAdmin ? "Issue one to get started." : "Nothing assigned to you."}
            />
          ) : (
            visible.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`card flex w-full items-center gap-3 p-3 text-left transition-colors ${
                  selected?.id === c.id
                    ? "border-brand-soft bg-bg-hover"
                    : "hover:bg-bg-hover"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    c.status === "signed"
                      ? "bg-accent-green/15 text-accent-green"
                      : "bg-accent-amber/15 text-accent-amber"
                  }`}
                >
                  {c.status === "signed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <FileSignature className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    {c.title}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isAdmin ? c.assignedToName : "Assigned to you"} ·{" "}
                    {c.status === "signed"
                      ? `signed ${ago(c.signedAt!)}`
                      : `issued ${ago(c.issuedAt)}`}
                  </div>
                </div>
                <span
                  className={`chip ${
                    c.status === "signed"
                      ? "bg-accent-green/15 text-accent-green"
                      : "bg-accent-amber/15 text-accent-amber"
                  }`}
                >
                  {c.status}
                </span>
              </button>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <Card className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {selected.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    For {selected.assignedToName} · issued{" "}
                    {dateOnly(selected.issuedAt)}
                  </div>
                </div>
                {selected.status === "signed" && (
                  <span className="chip bg-accent-green/15 text-accent-green">
                    <CheckCircle2 className="h-3 w-3" /> Signed
                  </span>
                )}
              </div>

              <PdfViewer
                dataUrl={selected.dataUrl}
                fileName={selected.fileName}
                height={520}
              />

              {selected.status === "signed" ? (
                <div className="mt-4 rounded-lg border border-line bg-bg-soft p-4">
                  <div className="mb-2 text-xs font-medium text-slate-400">
                    Signature
                  </div>
                  <div className="flex items-center gap-4">
                    {selected.signatureDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.signatureDataUrl}
                        alt="Signature"
                        className="h-16 rounded bg-white px-2"
                      />
                    )}
                    <div className="text-xs text-slate-400">
                      <div className="font-medium text-slate-200">
                        {selected.signerName}
                      </div>
                      <div>Signed {dateOnly(selected.signedAt!)}</div>
                    </div>
                  </div>
                </div>
              ) : canSign ? (
                <SignPanel onSign={sign} contractTitle={selected.title} />
              ) : (
                <div className="mt-4 rounded-lg border border-line bg-bg-soft px-4 py-3 text-sm text-slate-400">
                  {isAdmin
                    ? "Awaiting the employee's signature."
                    : "This contract is awaiting signature."}
                </div>
              )}
            </Card>
          ) : (
            <EmptyState
              icon={<FileSignature className="h-10 w-10" />}
              title="Select a contract"
              hint="Open a contract to read and sign it here."
            />
          )}
        </div>
      </div>

      {isAdmin && (
        <IssueModal
          open={showIssue}
          onClose={() => setShowIssue(false)}
          employees={users.filter((u) => u.role === "employee")}
          onIssue={async (input) => {
            const created = await addContract(input);
            setSelectedId(created.id);
          }}
        />
      )}
    </div>
  );
}

function SignPanel({
  onSign,
  contractTitle,
}: {
  onSign: (dataUrl: string) => void;
  contractTitle: string;
}) {
  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
        <PenLine className="h-4 w-4 text-brand-soft" /> Sign this contract
      </div>
      <SignaturePad onChange={setSignature} />
      <label className="mt-3 flex items-start gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line bg-bg-soft accent-brand"
        />
        <span>
          I have read and agree to the terms of <strong>{contractTitle}</strong>,
          and my electronic signature is legally binding.
        </span>
      </label>
      <div className="mt-3 flex justify-end">
        <button
          className="btn-primary"
          disabled={!signature || !agreed}
          onClick={() => signature && onSign(signature)}
        >
          <PenLine className="h-4 w-4" /> Agree &amp; sign
        </button>
      </div>
    </div>
  );
}

function IssueModal({
  open,
  onClose,
  employees,
  onIssue,
}: {
  open: boolean;
  onClose: () => void;
  employees: { id: string; name: string }[];
  onIssue: (input: Omit<Contract, "id">) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(employees[0]?.id ?? "");
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
    const emp = employees.find((e) => e.id === assignee);
    if (!dataUrl || !title.trim() || !emp) {
      setError("Add a title, choose a PDF, and select an employee.");
      return;
    }
    await onIssue({
      title: title.trim(),
      assignedToId: emp.id,
      assignedToName: emp.name,
      status: "pending",
      fileName: fileName || `${title}.pdf`,
      dataUrl,
      issuedAt: new Date().toISOString(),
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
      title="Issue a contract"
    >
      <div className="space-y-4">
        <div>
          <label className="label">PDF file</label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={onFile}
            className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dim"
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
            placeholder="e.g. Employment Agreement 2026"
          />
        </div>
        <div>
          <label className="label">Assign to</label>
          <select
            className="input"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
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
            Issue contract
          </button>
        </div>
      </div>
    </Modal>
  );
}
