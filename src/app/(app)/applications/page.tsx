"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Mail,
  Plus,
  RefreshCw,
  Trophy,
  Unplug,
} from "lucide-react";
import { useData, GmailStatus } from "@/lib/store";
import { RangeKey } from "@/lib/dateRange";
import { isInRange } from "@/lib/dateRange";
import { ApplicationStatus, JobApplication } from "@/lib/types";
import { EmptyState, Modal, PageHeader, StatCard } from "@/components/ui";
import RangeFilter from "@/components/RangeFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { relative } from "@/lib/format";

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-neutral-500">Loading applications…</div>
      }
    >
      <ApplicationsInner />
    </Suspense>
  );
}

function ApplicationsInner() {
  const { applications, setApplicationsAll, gmail, setGmail } = useData();
  const [range, setRange] = useState<RangeKey>("7days");
  const [now, setNow] = useState(() => new Date());
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const params = useSearchParams();

  // Refresh "now" each minute so range buckets stay accurate.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Load Gmail status once.
  useEffect(() => {
    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then((s: GmailStatus) => setGmail(s))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle OAuth redirect result.
  useEffect(() => {
    const g = params.get("gmail");
    if (g === "connected") {
      setToast("Gmail connected. Syncing your applications…");
      syncNow();
    } else if (g === "error") {
      setToast("Gmail connection failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function syncNow() {
    setSyncing(true);
    try {
      const res = await fetch("/api/gmail/sync");
      if (res.ok) {
        const data = await res.json();
        setApplicationsAll(data.applications ?? []);
        setGmail({ ...gmail, connected: true, lastSynced: data.syncedAt });
        setToast(`Synced ${data.synced ?? 0} applications from Gmail.`);
      } else if (res.status === 401) {
        setToast("Gmail isn't connected yet.");
      } else {
        setToast("Sync failed. Showing existing data.");
      }
    } catch {
      setToast("Could not reach Gmail. Showing existing data.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    await fetch("/api/gmail/disconnect", { method: "POST" });
    setGmail({ ...gmail, connected: false, email: undefined });
    setToast("Gmail disconnected.");
  }

  function connect() {
    if (!gmail.configured) {
      setShowHelp(true);
      return;
    }
    window.location.href = "/api/gmail/auth";
  }

  const filtered = useMemo(
    () =>
      applications
        .filter((a) => isInRange(a.date, range, now))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [applications, range, now]
  );

  const counts = useMemo(() => {
    const c: Record<ApplicationStatus, number> = {
      applied: 0,
      assessment: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    for (const a of filtered) c[a.status]++;
    return c;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Job Applications"
        subtitle="Tracked automatically from your Gmail — applied, interviews, assessments and offers."
        actions={
          <>
            <button className="btn-ghost" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add
            </button>
            {gmail.connected ? (
              <>
                <button
                  className="btn-ghost"
                  onClick={syncNow}
                  disabled={syncing}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                  />
                  {syncing ? "Syncing…" : "Sync now"}
                </button>
                <button className="btn-subtle" onClick={disconnect}>
                  <Unplug className="h-4 w-4" /> Disconnect
                </button>
              </>
            ) : (
              <button className="btn-primary" onClick={connect}>
                <Mail className="h-4 w-4" /> Connect Gmail
              </button>
            )}
          </>
        }
      />

      <GmailBanner
        gmail={gmail}
        onConnect={connect}
        onLearnMore={() => setShowHelp(true)}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <RangeFilter value={range} onChange={setRange} />
        <span className="text-xs text-neutral-500">
          {filtered.length} update{filtered.length === 1 ? "" : "s"} in range
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Applied"
          value={counts.applied}
          tone="blue"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Assessments"
          value={counts.assessment}
          tone="purple"
          icon={<ClipboardList className="h-4 w-4" />}
        />
        <StatCard
          label="Interviews"
          value={counts.interview}
          tone="amber"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Offers"
          value={counts.offer}
          tone="green"
          icon={<Trophy className="h-4 w-4" />}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3 text-sm font-medium text-neutral-900">
          Activity
        </div>
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Briefcase className="h-8 w-8" />}
              title="No application activity in this range"
              hint="Try a wider time range, sync your Gmail, or add an application manually."
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((a) => (
              <ApplicationRow key={a.id} app={a} />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-bg-card px-4 py-2.5 text-sm text-neutral-800 shadow-card">
          {toast}
        </div>
      )}

      <GmailHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
      <AddApplicationModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function ApplicationRow({ app }: { app: JobApplication }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-hover/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-soft text-sm font-semibold text-neutral-700">
        {app.company.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-neutral-900">{app.company}</span>
          {app.source === "gmail" && (
            <Mail className="h-3 w-3 shrink-0 text-neutral-500" />
          )}
        </div>
        <div className="truncate text-xs text-neutral-500">{app.role}</div>
        {app.emailSubject && (
          <div className="mt-0.5 truncate text-[11px] text-neutral-400">
            {app.emailSubject}
          </div>
        )}
      </div>
      <div className="hidden text-right text-xs text-neutral-500 sm:block">
        {relative(app.date)}
      </div>
      <StatusBadge status={app.status} />
    </div>
  );
}

function GmailBanner({
  gmail,
  onConnect,
  onLearnMore,
}: {
  gmail: GmailStatus;
  onConnect: () => void;
  onLearnMore: () => void;
}) {
  if (gmail.connected) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-green" />
        <span className="text-neutral-800">
          Gmail connected{gmail.email ? ` as ${gmail.email}` : ""}.
        </span>
        {gmail.lastSynced && (
          <span className="ml-auto text-xs text-neutral-500">
            Last synced {relative(gmail.lastSynced)}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <Mail className="h-5 w-5 shrink-0 text-brand-soft" />
      <span className="text-neutral-800">
        Showing <strong>sample data</strong>. Connect Gmail to track your real
        applications automatically.
      </span>
      <div className="flex gap-2 sm:ml-auto">
        <button className="btn-subtle text-xs" onClick={onLearnMore}>
          How it works
        </button>
        <button className="btn-primary text-xs" onClick={onConnect}>
          Connect Gmail
        </button>
      </div>
    </div>
  );
}

function GmailHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Connect Gmail">
      <div className="space-y-3 text-sm text-neutral-700">
        <p>
          The tracker reads your inbox and automatically detects job-search
          emails — application confirmations, interview invites, assessments and
          offers — then groups them by company.
        </p>
        <p className="font-medium text-neutral-900">To enable it:</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-neutral-500">
          <li>
            Create a project at{" "}
            <span className="text-brand-soft">console.cloud.google.com</span>.
          </li>
          <li>Enable the Gmail API.</li>
          <li>
            Create an OAuth Client ID (Web app) with redirect URI{" "}
            <code className="rounded bg-bg-soft px-1 text-[12px]">
              http://localhost:3000/api/gmail/callback
            </code>
            .
          </li>
          <li>
            Add the credentials to a <code>.env</code> file (see{" "}
            <code>.env.example</code>) and restart.
          </li>
        </ol>
        <p className="text-xs text-neutral-500">
          Until configured, the dashboard runs on realistic sample data so you
          can explore every feature.
        </p>
      </div>
    </Modal>
  );
}

function AddApplicationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addApplication } = useData();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("applied");

  async function submit() {
    if (!company.trim()) return;
    await addApplication({
      company: company.trim(),
      role: role.trim() || "Role not specified",
      status,
      date: new Date().toISOString(),
      source: "manual",
    });
    setCompany("");
    setRole("");
    setStatus("applied");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add application">
      <div className="space-y-4">
        <div>
          <label className="label">Company</label>
          <input
            className="input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Stripe"
          />
        </div>
        <div>
          <label className="label">Role</label>
          <input
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Product Designer"
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          >
            <option value="applied">Applied</option>
            <option value="assessment">Assessment</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Add application
          </button>
        </div>
      </div>
    </Modal>
  );
}
