"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Clock,
  FileSignature,
  FileText,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { useData } from "@/lib/store";
import { isInRange, RangeKey } from "@/lib/dateRange";
import { Card, StatCard } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ago, minutesToHm, relative } from "@/lib/format";
import { TimeEntry } from "@/lib/types";

function entryMinutes(e: TimeEntry): number {
  if (!e.clockOut) return 0;
  return (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 60000;
}

const DASH_RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7days", label: "7 days" },
  { key: "15days", label: "15 days" },
  { key: "30days", label: "30 days" },
];

export default function DashboardPage() {
  const { currentUser, applications, timeEntries, contracts, sops } = useData();
  const [range, setRange] = useState<RangeKey>("today");
  const now = new Date();
  const isAdmin = currentUser?.role === "admin";

  const myTime = useMemo(
    () => timeEntries.filter((e) => e.userId === currentUser?.id),
    [timeEntries, currentUser]
  );

  const minutesInRange = useMemo(
    () =>
      myTime
        .filter((e) => isInRange(e.clockIn, range, now))
        .reduce((sum, e) => sum + entryMinutes(e), 0),
    [myTime, range] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const recentApps = useMemo(
    () =>
      [...applications].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [applications]
  );

  const appsInRange = applications.filter((a) => isInRange(a.date, range, now));
  const offers = appsInRange.filter((a) => a.status === "offer").length;
  const interviews = appsInRange.filter((a) => a.status === "interview").length;

  // Admin sees ALL pending contracts (their own to sign + ones they've issued).
  // Everyone else sees only their own assignments.
  const pendingContracts = isAdmin
    ? contracts.filter((c) => c.status === "pending")
    : contracts.filter(
        (c) => c.assignedToId === currentUser?.id && c.status === "pending"
      );

  const firstName = currentUser?.name.split(" ")[0] ?? "there";
  const rangeLabel =
    DASH_RANGES.find((r) => r.key === range)?.label ?? "Today";

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-[#5b46e0] to-accent-purple p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
              {format(now, "EEEE, MMMM d")}
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Here&apos;s what&apos;s happening across your workspace.
            </p>
          </div>
          <Link
            href="/applications"
            className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            View applications
          </Link>
        </div>
      </div>

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-lg border border-line bg-bg-soft p-1">
        {DASH_RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              range === r.key
                ? "bg-brand text-white"
                : "text-neutral-500 hover:bg-bg-hover hover:text-neutral-800"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={`Applications (${rangeLabel})`}
          value={appsInRange.length}
          hint={`${offers} offer${offers === 1 ? "" : "s"}, ${interviews} interview${interviews === 1 ? "" : "s"}`}
          tone="blue"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label={`Time tracked (${rangeLabel})`}
          value={minutesToHm(minutesInRange)}
          hint="Across all projects"
          tone="teal"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label={isAdmin ? "Contracts pending" : "Contracts to sign"}
          value={pendingContracts.length}
          hint={
            pendingContracts.length
              ? isAdmin
                ? "Awaiting signature"
                : "Action needed"
              : "You're all caught up"
          }
          tone={pendingContracts.length ? "amber" : "green"}
          icon={<FileSignature className="h-4 w-4" />}
        />
        <StatCard
          label="SOPs available"
          value={sops.length}
          hint="Company playbooks"
          tone="purple"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-sm font-medium text-neutral-900">
              Recent application activity
            </h2>
            <Link
              href="/applications"
              className="flex items-center gap-1 text-xs text-brand-soft hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {recentApps.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-soft text-xs font-semibold text-neutral-700">
                  {a.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-neutral-900">
                    {a.company}
                  </div>
                  <div className="truncate text-xs text-neutral-500">
                    {a.role}
                  </div>
                </div>
                <span className="hidden text-xs text-neutral-500 sm:block">
                  {relative(a.date)}
                </span>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-medium text-neutral-900">
              {pendingContracts.length
                ? isAdmin
                  ? "Pending contracts"
                  : "Contracts awaiting your signature"
                : "Contracts"}
            </h2>
            {pendingContracts.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nothing pending right now.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingContracts.map((c) => (
                  <Link
                    key={c.id}
                    href="/contracts"
                    className="flex items-center gap-3 rounded-lg border border-line bg-bg-soft px-3 py-2.5 hover:bg-bg-hover"
                  >
                    <FileSignature className="h-4 w-4 text-accent-amber" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-neutral-900">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {isAdmin
                          ? `Assigned to ${c.assignedToName} · ${ago(c.issuedAt)}`
                          : `Issued ${ago(c.issuedAt)}`}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-neutral-500" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-medium text-neutral-900">Quick links</h2>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink href="/time-tracker" icon={<Clock className="h-4 w-4" />}>
                Track time
              </QuickLink>
              <QuickLink href="/job-search" icon={<Briefcase className="h-4 w-4" />}>
                Find jobs
              </QuickLink>
              <QuickLink href="/sops" icon={<FileText className="h-4 w-4" />}>
                Read SOPs
              </QuickLink>
              <QuickLink href="/insights" icon={<Trophy className="h-4 w-4" />}>
                Insights
              </QuickLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-line bg-bg-soft px-3 py-2.5 text-sm text-neutral-700 hover:bg-bg-hover hover:text-neutral-900"
    >
      <span className="text-brand-soft">{icon}</span>
      {children}
    </Link>
  );
}
