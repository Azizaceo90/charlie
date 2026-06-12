"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  FileSignature,
  Loader2,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { useData } from "@/lib/store";
import { Contract, ContractField, parseContractFields } from "@/lib/types";
import { Card, EmptyState, Modal, PageHeader } from "@/components/ui";
import PdfViewer from "@/components/PdfViewer";
import SignaturePad from "@/components/SignaturePad";
import ContractFieldEditor from "@/components/ContractFieldEditor";
import ContractSignViewer from "@/components/ContractSignViewer";
import { ago, dateOnly } from "@/lib/format";

export default function ContractsPage() {
  const {
    currentUser,
    users,
    contracts,
    addContract,
    removeContract,
    reopenContract,
    remindContract,
    signContract,
  } = useData();
  const isAdmin = currentUser?.role === "admin";

  async function handleDelete(c: Contract) {
    if (
      !window.confirm(
        `Delete "${c.title}" assigned to ${c.assignedToName}? The employee will no longer see this contract.`
      )
    )
      return;
    try {
      await removeContract(c.id);
      if (selectedId === c.id) setSelectedId(null);
    } catch {
      window.alert("Could not delete the contract. Try again.");
    }
  }
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

  function sign(body: {
    signatureDataUrl: string;
    fullName?: string;
    address?: string;
    phone?: string;
    fieldValues?: Record<string, string>;
  }) {
    if (!selected || !currentUser) return;
    signContract(selected.id, body);
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
          <span className="text-neutral-800">
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
                  <div className="truncate text-sm font-medium text-neutral-900">
                    {c.title}
                  </div>
                  <div className="text-[11px] text-neutral-500">
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
                {isAdmin && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        handleDelete(c);
                      }
                    }}
                    className="ml-1 rounded-md p-1 text-neutral-400 hover:bg-bg-card hover:text-accent-red"
                    title="Delete contract"
                  >
                    <Trash2 className="h-4 w-4" />
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <Card className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {selected.title}
                  </div>
                  <div className="text-xs text-neutral-500">
                    For {selected.assignedToName} · issued{" "}
                    {dateOnly(selected.issuedAt)}
                  </div>
                </div>
                {selected.status === "signed" ? (
                  <div className="flex items-center gap-2">
                    <span className="chip bg-accent-green/15 text-accent-green">
                      <CheckCircle2 className="h-3 w-3" /> Signed
                    </span>
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Re-open "${selected.title}"? The signature will be cleared and ${selected.assignedToName} will be asked to sign again.`
                            )
                          )
                            return;
                          try {
                            await reopenContract(selected.id);
                          } catch {
                            window.alert("Could not re-open. Try again.");
                          }
                        }}
                        className="btn-ghost text-xs"
                        title="Clear the signature and send back for re-sign"
                      >
                        <PenLine className="h-3.5 w-3.5" /> Re-open
                      </button>
                    )}
                  </div>
                ) : (
                  isAdmin && (
                    <RemindControl
                      key={selected.id}
                      contract={selected}
                      onRemind={() => remindContract(selected.id)}
                    />
                  )
                )}
              </div>

              <PdfViewer
                dataUrl={selected.dataUrl}
                fileName={selected.fileName}
                height={520}
              />

              {selected.status === "signed" ? (
                <div className="mt-4 rounded-lg border border-line bg-bg-soft p-4">
                  <div className="mb-2 text-xs font-medium text-neutral-500">
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
                    <div className="text-xs text-neutral-500">
                      <div className="font-medium text-neutral-800">
                        {selected.signerName}
                      </div>
                      <div>Signed {dateOnly(selected.signedAt!)}</div>
                    </div>
                  </div>
                </div>
              ) : canSign ? (
                <SignPanel
                  onSign={sign}
                  contract={selected}
                  defaultName={currentUser?.name ?? ""}
                />
              ) : (
                <div className="mt-4 rounded-lg border border-line bg-bg-soft px-4 py-3 text-sm text-neutral-500">
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

function RemindControl({
  contract,
  onRemind,
}: {
  contract: Contract;
  onRemind: () => Promise<{ emailed: boolean; error?: string }>;
}) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const r = await onRemind();
      setResult(
        r.emailed
          ? { ok: true, message: `Reminder emailed to ${contract.assignedToName}.` }
          : {
              ok: false,
              message:
                r.error ??
                "Saved an in-app reminder, but email isn't configured.",
            }
      );
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof Error ? e.message : "Could not send reminder.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={send}
        disabled={sending}
        className="btn-ghost text-xs"
        title={`Email ${contract.assignedToName} a reminder to sign`}
      >
        {sending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        Send reminder
      </button>
      {result ? (
        <span
          className={`flex items-center gap-1 text-[11px] ${
            result.ok ? "text-accent-green" : "text-accent-amber"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {result.message}
        </span>
      ) : (
        contract.remindedAt && (
          <span className="text-[11px] text-neutral-400">
            Last reminded {ago(contract.remindedAt)}
          </span>
        )
      )}
    </div>
  );
}

function SignPanel({
  onSign,
  contract,
  defaultName,
}: {
  onSign: (body: {
    signatureDataUrl: string;
    fullName?: string;
    address?: string;
    phone?: string;
    fieldValues?: Record<string, string>;
  }) => void;
  contract: Contract;
  defaultName: string;
}) {
  const { currentUser, saveSignature } = useData();
  const savedSignature = currentUser?.signature ?? null;
  const placedFields = parseContractFields(contract.fields);
  const hasFields = placedFields.length > 0;

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    const today = new Date().toLocaleDateString("en-US");
    placedFields.forEach((f) => {
      if (f.type === "name") out[f.id] = defaultName;
      else if (f.type === "date") out[f.id] = today;
    });
    return out;
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState(defaultName);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const fieldSignature = placedFields.find((f) => f.type === "signature");
  const fieldSignatureValue = fieldSignature
    ? fieldValues[fieldSignature.id]
    : undefined;

  const fieldsComplete = placedFields.every((f) => {
    const v = fieldValues[f.id];
    return Boolean(v && v.length);
  });

  const canSign = hasFields
    ? agreed && fieldsComplete
    : Boolean(signature) &&
      agreed &&
      fullName.trim().length > 0 &&
      address.trim().length > 0;

  return (
    <div className="mt-4 rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-900">
        <PenLine className="h-4 w-4 text-brand-soft" /> Sign this contract
      </div>

      {hasFields ? (
        <div className="mb-3">
          <div className="mb-2 text-xs font-medium text-neutral-500">
            Fill in each highlighted field on the document below.
          </div>
          <ContractSignViewer
            pdfDataUrl={contract.dataUrl}
            fields={placedFields}
            values={fieldValues}
            onChange={setFieldValues}
            savedSignature={savedSignature}
            onSaveSignature={async (d) => {
              await saveSignature(d);
            }}
            defaultName={defaultName}
          />
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Full legal name</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First Last"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, State ZIP"
              />
            </div>
          </div>

          <div className="mb-1 text-xs font-medium text-neutral-500">Signature</div>
          <SignaturePad
            onChange={setSignature}
            savedSignature={savedSignature}
            onSaveSignature={async (d) => {
              await saveSignature(d);
            }}
            defaultName={defaultName}
          />
        </>
      )}

      <label className="mt-3 flex items-start gap-2 text-xs text-neutral-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line bg-bg-soft accent-brand"
        />
        <span>
          I have read and agree to the terms of <strong>{contract.title}</strong>,
          and my electronic signature is legally binding.
        </span>
      </label>
      <div className="mt-3 flex justify-end">
        <button
          className="btn-primary"
          disabled={!canSign}
          onClick={() => {
            if (hasFields) {
              const sig = fieldSignatureValue ?? signature ?? "";
              onSign({
                signatureDataUrl: sig,
                fieldValues,
              });
            } else if (signature) {
              onSign({
                signatureDataUrl: signature,
                fullName: fullName.trim(),
                address: address.trim(),
                phone: phone.trim() || undefined,
              });
            }
          }}
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
  const [fields, setFields] = useState<ContractField[]>([]);
  const [error, setError] = useState("");

  function reset() {
    setTitle("");
    setFileName("");
    setDataUrl("");
    setFields([]);
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
      fields: fields.length ? JSON.stringify(fields) : null,
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
      wide
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
        {dataUrl && (
          <div className="rounded-lg border border-line bg-bg-soft p-3">
            <div className="mb-2 text-sm font-semibold text-neutral-900">
              Place fields on the document
            </div>
            <ContractFieldEditor
              pdfDataUrl={dataUrl}
              value={fields}
              onChange={setFields}
            />
            <p className="mt-2 text-[11px] text-neutral-500">
              Optional. If you don't add any fields, the employee will sign
              with the standard name / address / phone form below the signature.
            </p>
          </div>
        )}

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
