"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Play, Plus, Square, Trash2 } from "lucide-react";
import { useData } from "@/lib/store";
import { isInRange, RangeKey } from "@/lib/dateRange";
import { TimeEntry } from "@/lib/types";
import { Card, EmptyState, Modal, PageHeader, StatCard } from "@/components/ui";
import RangeFilter from "@/components/RangeFilter";
import { dateOnly, minutesToHm, timeOnly } from "@/lib/format";

const PROJECTS = [
  "Recruiting",
  "Internal Ops",
  "SOP Writing",
  "Admin",
  "Meetings",
];
const APP_SPEC_PROJECTS = ["Applications"];
const MEDICAL_PROJECTS = ["St Bernards", "UHC"];

function projectsFor(title?: string | null): string[] {
  if (title === "Application Specialist") return APP_SPEC_PROJECTS;
  if (title === "Medical Coder") return MEDICAL_PROJECTS;
  return PROJECTS;
}

/** Per-employee assigned projects (comma-separated) override the title default. */
function projectsForUser(user?: {
  title?: string | null;
  projects?: string | null;
}): string[] {
  const custom = (user?.projects ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return custom.length ? custom : projectsFor(user?.title);
}

function entryMinutes(e: TimeEntry, now: number): number {
  const end = e.clockOut ? new Date(e.clockOut).getTime() : now;
  return (end - new Date(e.clockIn).getTime()) / 60000;
}

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function TimeTrackerPage() {
  const { currentUser } = useData();
  if (currentUser?.role === "admin") return <TeamHoursView />;
  return <PersonalTracker />;
}

function PersonalTracker() {
  const {
    currentUser,
    timeEntries,
    addTimeEntry,
    updateTimeEntry,
    removeTimeEntry,
    submitTimesheet,
  } = useData();
  const [tick, setTick] = useState(Date.now());
  const projects = projectsForUser(currentUser ?? undefined);
  const [project, setProject] = useState(projects[0]);
  const [note, setNote] = useState("");
  const [range, setRange] = useState<RangeKey>("7days");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const myEntries = useMemo(
    () => timeEntries.filter((e) => e.userId === currentUser?.id),
    [timeEntries, currentUser]
  );

  const active = myEntries.find((e) => !e.clockOut);

  const todayMinutes = myEntries
    .filter((e) => isInRange(e.clockIn, "today", new Date(tick)))
    .reduce((s, e) => s + entryMinutes(e, tick), 0);

  const weekMinutes = myEntries
    .filter((e) => isInRange(e.clockIn, "7days", new Date(tick)))
    .reduce((s, e) => s + entryMinutes(e, tick), 0);

  const visible = useMemo(
    () =>
      myEntries
        .filter((e) => isInRange(e.clockIn, range, new Date(tick)))
        .sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1)),
    [myEntries, range, tick]
  );

  function clockIn() {
    if (active || !currentUser) return;
    addTimeEntry({
      userId: currentUser.id,
      clockIn: new Date().toISOString(),
      project,
      note: note.trim() || undefined,
    });
    setNote("");
  }

  function clockOut() {
    if (!active) return;
    updateTimeEntry(active.id, { clockOut: new Date().toISOString() });
  }

  function remove(id: string) {
    removeTimeEntry(id);
  }

  const elapsed = active
    ? tick - new Date(active.clockIn).getTime()
    : 0;

  return (
    <div>
      <PageHeader
        title="Time Tracker"
        subtitle="Clock in and out, tag your work, and review your hours."
        actions={
          <button className="btn-ghost" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Manual entry
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="text-sm text-neutral-500">
            {active ? "Currently tracking" : "Not tracking"}
          </div>
          <div
            className={`mt-2 font-mono text-4xl font-semibold tabular-nums ${
              active ? "text-accent-green" : "text-neutral-900"
            }`}
          >
            {fmtClock(elapsed)}
          </div>
          {active && (
            <div className="mt-1 text-xs text-neutral-500">
              {active.project} · since {timeOnly(active.clockIn)}
            </div>
          )}

          {!active && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Project</label>
                <select
                  className="input"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What are you working on?"
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            {active ? (
              <button
                className="btn w-full bg-brand text-white hover:bg-brand-dim"
                onClick={clockOut}
              >
                <Square className="h-4 w-4" /> Clock out
              </button>
            ) : (
              <button className="btn-primary w-full" onClick={clockIn}>
                <Play className="h-4 w-4" /> Clock in
              </button>
            )}
          </div>

          {currentUser?.title === "Medical Coder" && active && (
            <ChartsCodedInput
              entryId={active.id}
              initial={active.chartsCoded ?? 0}
              onSave={(n) => updateTimeEntry(active.id, { chartsCoded: n })}
            />
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-2">
          <StatCard
            label="Today"
            value={minutesToHm(todayMinutes)}
            tone="teal"
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            label="This week"
            value={minutesToHm(weekMinutes)}
            tone="blue"
            icon={<Clock className="h-4 w-4" />}
          />
          <div className="col-span-2 card p-5">
            <div className="mb-3 text-sm font-medium text-neutral-900">
              Hours by project (7 days)
            </div>
            <ProjectBars entries={myEntries} now={tick} />
          </div>
        </div>
      </div>

      <WeeklySubmitPanel
        entries={myEntries}
        onSubmit={submitTimesheet}
        paymentReady={Boolean(
          currentUser?.paymentMethod && currentUser?.paymentAccount
        )}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-900">Entries</h2>
        <RangeFilter value={range} onChange={setRange} />
      </div>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="No time entries in this range"
              hint="Clock in above or add a manual entry."
            />
          </div>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-bg-hover/50"
              >
                <div className="w-24 shrink-0 text-xs text-neutral-500">
                  {dateOnly(e.clockIn)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-neutral-900">
                    {e.project ?? "Untitled"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {timeOnly(e.clockIn)} –{" "}
                    {e.clockOut ? timeOnly(e.clockOut) : "running"}
                    {e.note ? ` · ${e.note}` : ""}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums text-neutral-800">
                  {e.clockOut ? minutesToHm(entryMinutes(e, tick)) : "—"}
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-bg-hover hover:text-accent-red"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ManualEntryModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        projects={projects}
      />
    </div>
  );
}

function ProjectBars({ entries, now }: { entries: TimeEntry[]; now: number }) {
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (!isInRange(e.clockIn, "7days", new Date(now))) continue;
      const mins = entryMinutes(e, now);
      map.set(e.project ?? "Other", (map.get(e.project ?? "Other") ?? 0) + mins);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries, now]);

  const max = Math.max(1, ...totals.map(([, m]) => m));
  if (totals.length === 0)
    return <p className="text-sm text-neutral-500">No hours logged this week.</p>;

  return (
    <div className="space-y-2.5">
      {totals.map(([project, mins]) => (
        <div key={project} className="flex items-center gap-3">
          <div className="w-32 shrink-0 truncate text-xs text-neutral-500">
            {project}
          </div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-soft">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(mins / max) * 100}%` }}
            />
          </div>
          <div className="w-14 shrink-0 text-right text-xs tabular-nums text-neutral-700">
            {minutesToHm(mins)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ManualEntryModal({
  open,
  onClose,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  projects: string[];
}) {
  const { currentUser, addTimeEntry } = useData();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [project, setProject] = useState(projects[0]);

  async function submit() {
    if (!currentUser) return;
    const clockIn = new Date(`${date}T${start}`).toISOString();
    const clockOut = new Date(`${date}T${end}`).toISOString();
    if (new Date(clockOut) <= new Date(clockIn)) return;
    await addTimeEntry({
      userId: currentUser.id,
      clockIn,
      clockOut,
      project,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add manual entry">
      <div className="space-y-4">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start</label>
            <input
              type="time"
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">End</label>
            <input
              type="time"
              className="input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Project</label>
          <select
            className="input"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Add entry
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TeamHoursView() {
  const { users, timeEntries } = useData();
  const [range, setRange] = useState<RangeKey>("today");
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const employees = useMemo(
    () => users.filter((u) => u.role === "employee"),
    [users]
  );

  const inRange = useMemo(
    () =>
      timeEntries.filter((e) => isInRange(e.clockIn, range, new Date(tick))),
    [timeEntries, range, tick]
  );

  const totalsByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of inRange) {
      map.set(e.userId, (map.get(e.userId) ?? 0) + entryMinutes(e, tick));
    }
    return map;
  }, [inRange, tick]);

  const totalMins = Array.from(totalsByUser.values()).reduce((s, m) => s + m, 0);
  const activePeople = Array.from(totalsByUser.values()).filter((m) => m > 0).length;

  const rows = useMemo(
    () =>
      employees
        .map((u) => ({ user: u, mins: totalsByUser.get(u.id) ?? 0 }))
        .sort((a, b) => b.mins - a.mins),
    [employees, totalsByUser]
  );
  const maxMins = Math.max(1, ...rows.map((r) => r.mins));

  const recent = useMemo(
    () =>
      [...inRange]
        .sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1))
        .slice(0, 12)
        .map((e) => ({
          entry: e,
          user: users.find((u) => u.id === e.userId),
        })),
    [inRange, users]
  );

  return (
    <div>
      <PageHeader
        title="Team hours"
        subtitle="Time logged by your team."
        actions={<RangeFilter value={range} onChange={setRange} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Total team hours"
          value={minutesToHm(totalMins)}
          tone="blue"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="People logging time"
          value={`${activePeople}/${employees.length}`}
          tone="teal"
        />
        <StatCard
          label="Avg per person"
          value={
            activePeople > 0 ? minutesToHm(totalMins / activePeople) : "0m"
          }
          tone="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">
            Hours by employee
          </h2>
          {employees.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="No employees yet"
              hint="Add employees from the Team page."
            />
          ) : (
            <div className="space-y-3">
              {rows.map(({ user, mins }) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: user.avatarColor ?? "#0073ea" }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-neutral-900">
                      {user.name}
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-soft">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(mins / maxMins) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-neutral-700">
                    {minutesToHm(mins)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-3 text-sm font-medium text-neutral-900">
            Recent activity
          </div>
          {recent.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Clock className="h-8 w-8" />}
                title="No entries in this range"
                hint="Pick a wider time range."
              />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recent.map(({ entry, user }) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: user?.avatarColor ?? "#0073ea" }}
                  >
                    {(user?.name ?? "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-neutral-900">
                      {user?.name ?? "Unknown"}
                    </div>
                    <div className="truncate text-xs text-neutral-500">
                      {entry.project ?? "—"} · {dateOnly(entry.clockIn)} ·{" "}
                      {timeOnly(entry.clockIn)}
                      {entry.clockOut ? `–${timeOnly(entry.clockOut)}` : ""}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-neutral-700">
                    {entry.clockOut ? minutesToHm(entryMinutes(entry, tick)) : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <SubmittedTimesheets />
    </div>
  );
}

function SubmittedTimesheets() {
  const { users, timeEntries, applications, approveTimesheet } = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        weekStart: Date;
        minutes: number;
        charts: number;
        submittedAt: string;
        approvedAt: string | null;
        unapprovedCount: number;
      }
    >();
    for (const e of timeEntries) {
      if (!e.submittedAt || !e.clockOut) continue;
      const start = new Date(e.clockIn);
      const day = start.getDay();
      start.setDate(start.getDate() - ((day + 6) % 7));
      start.setHours(0, 0, 0, 0);
      const key = `${e.userId}|${start.toISOString().slice(0, 10)}`;
      const mins =
        (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) /
        60000;
      const row = map.get(key);
      if (row) {
        row.minutes += mins;
        row.charts += e.chartsCoded ?? 0;
        if (e.submittedAt > row.submittedAt) row.submittedAt = e.submittedAt;
        if (e.approvedAt && (!row.approvedAt || e.approvedAt > row.approvedAt))
          row.approvedAt = e.approvedAt;
        if (!e.approvedAt) row.unapprovedCount += 1;
      } else {
        map.set(key, {
          userId: e.userId,
          weekStart: start,
          minutes: mins,
          charts: e.chartsCoded ?? 0,
          submittedAt: e.submittedAt,
          approvedAt: e.approvedAt ?? null,
          unapprovedCount: e.approvedAt ? 0 : 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.unapprovedCount !== b.unapprovedCount) {
        return b.unapprovedCount - a.unapprovedCount;
      }
      return a.submittedAt < b.submittedAt ? 1 : -1;
    });
  }, [timeEntries]);

  async function approve(userId: string, weekStart: Date) {
    const key = `${userId}-${weekStart.toISOString()}`;
    setBusy(key);
    const res = await approveTimesheet(userId, weekStart.toISOString());
    setBusy(null);
    setToast(
      res.approved > 0
        ? `Approved ${res.approved} entries.`
        : res.message ?? "Nothing to approve."
    );
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm font-medium text-neutral-900">
          Submitted timesheets
        </h2>
        {toast && <span className="text-xs text-neutral-500">{toast}</span>}
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-neutral-400">
          No timesheets submitted yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-2 font-medium">Employee</th>
                <th className="px-5 py-2 font-medium">Week of</th>
                <th className="px-5 py-2 font-medium">Hours</th>
                <th className="px-5 py-2 font-medium">Output</th>
                <th className="px-5 py-2 font-medium">Pay via</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const u = users.find((x) => x.id === r.userId);
                const key = `${r.userId}-${r.weekStart.toISOString()}`;
                const pending = r.unapprovedCount > 0;
                const weekEnd = new Date(r.weekStart);
                weekEnd.setDate(weekEnd.getDate() + 7);
                const isMedical = u?.title === "Medical Coder";
                const isAppSpec = u?.title === "Application Specialist";
                const appliedThisWeek = isAppSpec
                  ? applications.filter((a) => {
                      const t = new Date(a.date).getTime();
                      return t >= r.weekStart.getTime() && t < weekEnd.getTime();
                    }).length
                  : 0;
                const outputLabel = isMedical
                  ? r.charts
                    ? `${r.charts} charts`
                    : "—"
                  : isAppSpec
                    ? `${appliedThisWeek} applied`
                    : "—";
                return (
                  <tr
                    key={key}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-neutral-900">
                      {u?.name ?? "Unknown"}
                      <div className="text-[11px] text-neutral-500">
                        {u?.title ?? ""}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-neutral-700">
                      {r.weekStart.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-neutral-700">
                      {minutesToHm(r.minutes)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-neutral-700">
                      {outputLabel}
                    </td>
                    <td className="px-5 py-3 text-xs text-neutral-700">
                      {u?.paymentMethod ? (
                        <div>
                          <div className="font-medium">{u.paymentMethod}</div>
                          <div className="text-neutral-500">
                            {u.paymentAccount ?? "—"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-400">Not set</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {pending ? (
                        <span className="chip bg-accent-amber/15 text-accent-amber">
                          Pending
                        </span>
                      ) : (
                        <span className="chip bg-accent-green/15 text-accent-green">
                          Approved
                          {r.approvedAt
                            ? ` ${new Date(r.approvedAt).toLocaleDateString()}`
                            : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {pending && (
                        <button
                          onClick={() => approve(r.userId, r.weekStart)}
                          className="btn-primary text-xs"
                          disabled={busy === key}
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ChartsCodedInput({
  entryId,
  initial,
  onSave,
}: {
  entryId: string;
  initial: number;
  onSave: (n: number) => void;
}) {
  const [val, setVal] = useState<string>(String(initial));
  useEffect(() => {
    setVal(String(initial));
  }, [entryId, initial]);

  function commit() {
    const n = Math.max(0, parseInt(val || "0", 10) || 0);
    setVal(String(n));
    onSave(n);
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-bg-soft p-3">
      <label className="label">Charts coded today</label>
      <input
        type="number"
        min={0}
        className="input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

function weekStartLocal(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = (day + 6) % 7;
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function WeeklySubmitPanel({
  entries,
  onSubmit,
  paymentReady,
}: {
  entries: TimeEntry[];
  onSubmit: () => Promise<{ submitted: number; message?: string }>;
  paymentReady: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const start = weekStartLocal(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const weekEntries = entries.filter((e) => {
    const t = new Date(e.clockIn).getTime();
    return t >= start.getTime() && t < end.getTime() && e.clockOut;
  });
  const totalMins = weekEntries.reduce((s, e) => {
    return s + (new Date(e.clockOut!).getTime() - new Date(e.clockIn).getTime()) / 60000;
  }, 0);
  const totalCharts = weekEntries.reduce(
    (s, e) => s + (e.chartsCoded ?? 0),
    0
  );
  const unsubmitted = weekEntries.filter((e) => !e.submittedAt);
  const submittedAt = weekEntries.find((e) => e.submittedAt)?.submittedAt;
  const allSubmitted = unsubmitted.length === 0 && weekEntries.length > 0;

  async function handle() {
    setBusy(true);
    const res = await onSubmit();
    setBusy(false);
    setToast(
      res.submitted > 0
        ? `Submitted ${res.submitted} entries for the week.`
        : res.message ?? "Nothing to submit."
    );
    setTimeout(() => setToast(null), 4000);
  }

  const label = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Week of {label}
        </div>
        <div className="mt-1 text-sm text-neutral-700">
          {minutesToHm(totalMins)} ·{" "}
          {totalCharts > 0 ? `${totalCharts} charts · ` : ""}
          {weekEntries.length} entr{weekEntries.length === 1 ? "y" : "ies"}
        </div>
        {allSubmitted && submittedAt && (
          <div className="mt-1 text-xs text-accent-green">
            Submitted on {new Date(submittedAt).toLocaleString()}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {toast && <span className="text-xs text-neutral-500">{toast}</span>}
        {!paymentReady && (
          <span className="text-xs text-accent-red">
            Add a payment method in My Account first.
          </span>
        )}
        <button
          className="btn-primary"
          onClick={handle}
          disabled={busy || unsubmitted.length === 0 || !paymentReady}
          title={
            !paymentReady
              ? "Add a payment method first"
              : unsubmitted.length === 0
                ? "Nothing to submit"
                : `Submit ${unsubmitted.length} entries`
          }
        >
          {allSubmitted ? "Resubmit" : "Submit timesheet"}
        </button>
      </div>
    </div>
  );
}
