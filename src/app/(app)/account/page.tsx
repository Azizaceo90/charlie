"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
  Trash2,
} from "lucide-react";
import { useData } from "@/lib/store";
import { PersonalDoc } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { ago } from "@/lib/format";

const DOC_CATEGORIES = ["Resume", "Certification", "ID", "Other"];

export default function AccountPage() {
  const { currentUser } = useData();
  if (!currentUser) return null;

  const onboardingDone = Boolean(currentUser.onboardingDone);

  return (
    <div>
      <PageHeader
        title="My Account"
        subtitle="Your onboarding info and personal documents."
      />

      {!onboardingDone && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-accent-amber/40 bg-accent-amber/10 px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-accent-amber" />
          <span className="text-neutral-700">
            Please complete the basic info below — your legal name, date of
            birth, address, and phone are required.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <ProfileSection />
        <DocsSection />
      </div>
    </div>
  );
}

function ProfileSection() {
  const { currentUser, updateProfile } = useData();
  const [fullLegalName, setFullLegalName] = useState(
    currentUser?.fullLegalName ?? ""
  );
  const [dob, setDob] = useState(
    currentUser?.dateOfBirth
      ? new Date(currentUser.dateOfBirth).toISOString().slice(0, 10)
      : ""
  );
  const [address, setAddress] = useState(currentUser?.address ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [emergencyName, setEmergencyName] = useState(
    currentUser?.emergencyName ?? ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    currentUser?.emergencyPhone ?? ""
  );
  const [paymentMethod, setPaymentMethod] = useState(
    currentUser?.paymentMethod ?? "Wise"
  );
  const [paymentAccount, setPaymentAccount] = useState(
    currentUser?.paymentAccount ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    const err = await updateProfile({
      fullLegalName,
      dateOfBirth: dob ? new Date(dob).toISOString() : null,
      address,
      phone,
      emergencyName,
      emergencyPhone,
      paymentMethod,
      paymentAccount,
    });
    setSaving(false);
    if (err) setError(err);
    else setSavedAt(Date.now());
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Onboarding info
      </h2>
      <div className="space-y-4">
        <div>
          <label className="label">Full legal name</label>
          <input
            className="input"
            value={fullLegalName}
            onChange={(e) => setFullLegalName(e.target.value)}
            placeholder="First Middle Last"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Date of birth</label>
            <input
              type="date"
              className="input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
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
        </div>
        <div>
          <label className="label">Address</label>
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, City, State ZIP"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Emergency contact name</label>
            <input
              className="input"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Emergency contact phone</label>
            <input
              className="input"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Payment method</label>
            <select
              className="input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Wise">Wise</option>
              <option value="Upwork">Upwork</option>
              <option value="Payoneer">Payoneer</option>
            </select>
          </div>
          <div>
            <label className="label">
              {paymentMethod === "Upwork"
                ? "Upwork username"
                : paymentMethod === "Payoneer"
                  ? "Payoneer email / ID"
                  : "Wise email / ID"}
            </label>
            <input
              className="input"
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              placeholder={
                paymentMethod === "Upwork" ? "@username" : "you@example.com"
              }
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {savedAt && Date.now() - savedAt < 3500 ? (
            <span className="flex items-center gap-1 text-xs text-accent-green">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          ) : (
            <span className="text-xs text-neutral-400">
              Required: legal name, DOB, address, phone.
            </span>
          )}
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Card>
  );
}

function DocsSection() {
  const { personalDocs, addPersonalDoc, removePersonalDoc } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DOC_CATEGORIES[0]);
  const [fileName, setFileName] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setTitle("");
    setFileName("");
    setDataUrl("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setError("File is larger than 8 MB.");
      return;
    }
    setError(null);
    setFileName(f.name);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function upload() {
    if (!dataUrl || !title.trim()) {
      setError("Add a title and choose a file.");
      return;
    }
    setUploading(true);
    try {
      await addPersonalDoc({
        title: title.trim(),
        category,
        fileName,
        dataUrl,
        sizeKb: Math.round(dataUrl.length / 1024),
        uploadedAt: new Date().toISOString(),
      });
      reset();
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(d: PersonalDoc) {
    if (!window.confirm(`Delete "${d.title}"?`)) return;
    try {
      await removePersonalDoc(d.id);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Personal documents
      </h2>
      <div className="space-y-3 rounded-lg border border-line bg-bg-soft p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Resume"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">File</label>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={onFile}
            className="block w-full text-sm text-neutral-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dim"
          />
          {fileName && (
            <p className="mt-1.5 text-xs text-accent-green">Loaded {fileName}</p>
          )}
        </div>
        {error && <p className="text-xs text-accent-red">{error}</p>}
        <div className="flex justify-end">
          <button
            className="btn-primary"
            onClick={upload}
            disabled={uploading || !dataUrl}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </button>
        </div>
      </div>

      <div className="mt-4">
        {personalDocs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line py-8 text-center text-sm text-neutral-400">
            <FileText className="mx-auto mb-2 h-6 w-6" />
            No documents yet.
          </div>
        ) : (
          <div className="divide-y divide-line rounded-lg border border-line">
            {personalDocs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-neutral-900">
                    {d.title}
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {(d.category ?? "Other") + " · "}
                    {Math.round(d.sizeKb)} KB · uploaded {ago(d.uploadedAt)}
                  </div>
                </div>
                <a
                  href={d.dataUrl}
                  download={d.fileName}
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-bg-hover hover:text-neutral-900"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => remove(d)}
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-bg-hover hover:text-accent-red"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
