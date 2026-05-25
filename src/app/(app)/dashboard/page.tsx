"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Briefcase,
  Clock,
  FileSignature,
  FileText,
  Trophy,
} from "lucide-react";
import { useData } from "@/lib/store";
import { isInRange } from "@/lib/dateRange";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { ago, minutesToHm, relative } from "@/lib/format";
import { TimeEntry } from "@/lib/types";

function entryMinutes(e: TimeEntry): number {
  if (!e.clockOut) return 0;
  return (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 60000;
}

export default function DashboardPage() {
  const { currentUser, applications, timeEntries, contracts, sops } = useData();
  const now = new Date();

  const myTime = useMemo(
    () => timeEntries.filter((e) => e.userId === currentUser?.id),
    [timeEntries, currentUser]
  );

  const weekMinutes = useMemo(
    () =>
      myTime
        .filter((e) => isInRange(e.clockIn, "7days", now))
        .reduce((sum, e) => sum + entryMinutes(e), 0),
    [myTime] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const recentApps = useMemo(
    () =>
      [...applications].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [applications]
  );

  const weekApps = applications.filter((a) => isInRange(a.date, "7days", now));
  const offers = weekApps.filter((a) => a.status === "offer").length;
  const interviews = weekApps.filter((a) => a.status === "interview").length;

  const myPendingContracts = contracts.filter(
    (c) => c.assignedToId === currentUser?.id && c.status === "pending"
  );

  const firstName = currentUser?.name.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Your personal overview — applications, time, contracts and documents."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Applications (7d)"
          value={weekApps.length}
          hint={`${offers} offer${offers === 1 ? "" : "s"}, ${interviews} interview${interviews === 1 ? "" : "s"}`}
          tone="blue"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Time tracked (7d)"
          value={minutesToHm(weekMinutes)}
          hint="Across all projects"
          tone="teal"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Contracts to sign"
          value={myPendingContracts.length}
          hint={
            myPendingContracts.length ? "Action needed" : "You're all caught up"
          }
          tone={myPendingContracts.length ? "amber" : "green"}
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
            <h2 className="text-sm font-medium text-white">
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-soft text-xs font-semibold text-slate-300">
                  {a.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    {a.company}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {a.role}
                  </div>
                </div>
                <span className="hidden text-xs text-slate-500 sm:block">
                  {relative(a.date)}
                </span>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-medium text-white">
              {myPendingContracts.length
                ? "Contracts awaiting your signature"
                : "Contracts"}
            </h2>
            {myPendingContracts.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nothing to sign right now.
              </p>
            ) : (
              <div className="space-y-2">
                {myPendingContracts.map((c) => (
                  <Link
                    key={c.id}
                    href="/contracts"
                    className="flex items-center gap-3 rounded-lg border border-line bg-bg-soft px-3 py-2.5 hover:bg-bg-hover"
                  >
                    <FileSignature className="h-4 w-4 text-accent-amber" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-white">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Issued {ago(c.issuedAt)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-medium text-white">Quick links</h2>
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
      className="flex items-center gap-2 rounded-lg border border-line bg-bg-soft px-3 py-2.5 text-sm text-slate-300 hover:bg-bg-hover hover:text-white"
    >
      <span className="text-brand-soft">{icon}</span>
      {children}
    </Link>
  );
}
