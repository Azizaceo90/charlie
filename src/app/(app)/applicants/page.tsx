"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star, Users } from "lucide-react";
import { useData } from "@/lib/store";
import { Applicant, ApplicantStage } from "@/lib/types";
import { Card, EmptyState, Modal, PageHeader, StatCard } from "@/components/ui";
import { ago } from "@/lib/format";

const STAGES: { key: ApplicantStage; label: string; color: string }[] = [
  { key: "applied", label: "Applied", color: "#3b82f6" },
  { key: "screening", label: "Screening", color: "#14b8a6" },
  { key: "assessment", label: "Assessment", color: "#a855f7" },
  { key: "interview", label: "Interview", color: "#f59e0b" },
  { key: "offer", label: "Offer", color: "#6366f1" },
  { key: "hired", label: "Hired", color: "#22c55e" },
  { key: "rejected", label: "Rejected", color: "#64748b" },
];

export default function ApplicantsPage() {
  const { currentUser, applicants, setApplicants } = useData();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applicants;
    return applicants.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [applicants, query]);

  if (!isAdmin) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Admins only"
        hint="The applicants pipeline is available to admin accounts."
      />
    );
  }

  function move(id: string, stage: ApplicantStage) {
    setApplicants(applicants.map((a) => (a.id === id ? { ...a, stage } : a)));
  }

  const active = applicants.filter(
    (a) => a.stage !== "hired" && a.stage !== "rejected"
  ).length;
  const offers = applicants.filter((a) => a.stage === "offer").length;
  const hired = applicants.filter((a) => a.stage === "hired").length;

  return (
    <div>
      <PageHeader
        title="Applicants"
        subtitle="Your hiring pipeline — drag candidates through each stage."
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add applicant
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={applicants.length} tone="brand" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Active" value={active} tone="blue" />
        <StatCard label="Offers" value={offers} tone="amber" />
        <StatCard label="Hired" value={hired} tone="green" />
      </div>

      <div className="mb-5 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search applicants"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const items = filtered.filter((a) => a.stage === stage.key);
          return (
            <div key={stage.key} className="w-72 shrink-0">
              <div className="mb-2 flex items-center gap-2 px-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: stage.color }}
                />
                <span className="text-sm font-medium text-white">
                  {stage.label}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-line bg-bg-soft/50 p-2">
                {items.length === 0 ? (
                  <div className="px-2 py-6 text-center text-xs text-slate-600">
                    No candidates
                  </div>
                ) : (
                  items.map((a) => (
                    <ApplicantCard
                      key={a.id}
                      applicant={a}
                      onMove={(s) => move(a.id, s)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddApplicantModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={(a) => setApplicants([a, ...applicants])}
      />
    </div>
  );
}

function ApplicantCard({
  applicant,
  onMove,
}: {
  applicant: Applicant;
  onMove: (stage: ApplicantStage) => void;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">
            {applicant.name}
          </div>
          <div className="truncate text-xs text-slate-400">
            {applicant.role}
          </div>
        </div>
        {applicant.rating ? (
          <div className="flex items-center gap-0.5 text-xs text-accent-amber">
            <Star className="h-3 w-3 fill-current" />
            {applicant.rating}
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate">{applicant.location ?? "—"}</span>
        <span>{ago(applicant.appliedAt)}</span>
      </div>
      <select
        value={applicant.stage}
        onChange={(e) => onMove(e.target.value as ApplicantStage)}
        className="mt-2 w-full rounded-md border border-line bg-bg-soft px-2 py-1 text-xs text-slate-300 outline-none focus:border-brand-soft"
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            Move to {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddApplicantModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (a: Applicant) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState<ApplicantStage>("applied");
  const [location, setLocation] = useState("");

  function submit() {
    if (!name.trim()) return;
    onAdd({
      id: `applicant-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || "unknown@example.com",
      role: role.trim() || "Unspecified",
      stage,
      appliedAt: new Date().toISOString(),
      location: location.trim() || undefined,
    });
    setName("");
    setEmail("");
    setRole("");
    setLocation("");
    setStage("applied");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add applicant">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
        </div>
        <div>
          <label className="label">Role applied for</label>
          <input
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Operations Associate"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Stage</label>
            <select
              className="input"
              value={stage}
              onChange={(e) => setStage(e.target.value as ApplicantStage)}
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Remote"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Add applicant
          </button>
        </div>
      </div>
    </Modal>
  );
}
