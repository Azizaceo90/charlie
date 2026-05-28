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
  "Client Onboarding",
  "Recruiting",
  "Internal Ops",
  "SOP Writing",
  "Admin",
  "Meetings",
];
const APP_SPEC_PROJECTS = ["Applications"];
const MEDICAL_PROJECTS = ["St Bernards"];

function projectsFor(title?: string | null): string[] {
  if (title === "Application Specialist") return APP_SPEC_PROJECTS;
  if (title === "Medical Coder") return MEDICAL_PROJECTS;
  return PROJECTS;
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
  const { currentUser, timeEntries, addTimeEntry, updateTimeEntry, removeTimeEntry } =
    useData();
  const [tick, setTick] = useState(Date.now());
  const projects = projectsFor(currentUser?.title);
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
  const [range, setRange] = useState<RangeKey>("7days");
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
    </div>
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
