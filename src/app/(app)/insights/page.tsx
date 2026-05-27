"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { useData } from "@/lib/store";
import { isInRange, rangeInterval, RangeKey } from "@/lib/dateRange";
import { ApplicationStatus, TimeEntry } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import RangeFilter from "@/components/RangeFilter";
import { minutesToHm } from "@/lib/format";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  applied: "#d4d4d4",
  assessment: "#a3a3a3",
  interview: "#737373",
  offer: "#111113",
  rejected: "#e5e5e5",
};

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e5e5e8",
  borderRadius: 8,
  fontSize: 12,
  color: "#18181b",
  boxShadow: "0 10px 30px rgba(16,24,40,0.10)",
};

function entryMinutes(e: TimeEntry): number {
  if (!e.clockOut) return 0;
  return (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 60000;
}

export default function InsightsPage() {
  const { currentUser, applications, timeEntries } = useData();
  const [range, setRange] = useState<RangeKey>("30days");
  const now = new Date();

  const inRangeApps = useMemo(
    () => applications.filter((a) => isInRange(a.date, range, now)),
    [applications, range] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Build a day-by-day series across the active interval.
  const days = useMemo(() => {
    const { start, end } = rangeInterval(range, now);
    const startMs = Math.max(start.getTime(), now.getTime() - 1000 * 60 * 60 * 24 * 60);
    const out: { key: string; label: string }[] = [];
    const cursor = new Date(startMs);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      out.push({
        key: cursor.toISOString().slice(0, 10),
        label: format(cursor, "MMM d"),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out.slice(-31);
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  const appsSeries = useMemo(() => {
    return days.map((d) => {
      const count = inRangeApps.filter(
        (a) => a.date.slice(0, 10) === d.key
      ).length;
      return { label: d.label, Applications: count };
    });
  }, [days, inRangeApps]);

  const statusData = useMemo(() => {
    const order: ApplicationStatus[] = [
      "applied",
      "assessment",
      "interview",
      "offer",
      "rejected",
    ];
    return order
      .map((s) => ({
        name: s.charAt(0).toUpperCase() + s.slice(1),
        status: s,
        value: inRangeApps.filter((a) => a.status === s).length,
      }))
      .filter((d) => d.value > 0);
  }, [inRangeApps]);

  const funnel = useMemo(() => {
    const stages: { stage: string; status: ApplicationStatus }[] = [
      { stage: "Applied", status: "applied" },
      { stage: "Assessment", status: "assessment" },
      { stage: "Interview", status: "interview" },
      { stage: "Offer", status: "offer" },
    ];
    return stages.map((s) => ({
      stage: s.stage,
      count: inRangeApps.filter((a) => a.status === s.status).length,
      fill: STATUS_COLORS[s.status],
    }));
  }, [inRangeApps]);

  const timeSeries = useMemo(() => {
    const mine = timeEntries.filter((e) => e.userId === currentUser?.id);
    return days.map((d) => {
      const mins = mine
        .filter((e) => e.clockIn.slice(0, 10) === d.key)
        .reduce((s, e) => s + entryMinutes(e), 0);
      return { label: d.label, hours: Math.round((mins / 60) * 10) / 10 };
    });
  }, [days, timeEntries, currentUser]);

  const totalApps = inRangeApps.length;
  const offers = inRangeApps.filter((a) => a.status === "offer").length;
  const interviews = inRangeApps.filter((a) => a.status === "interview").length;
  const offerRate = totalApps ? Math.round((offers / totalApps) * 100) : 0;
  const interviewRate = totalApps
    ? Math.round((interviews / totalApps) * 100)
    : 0;
  const totalMins = timeSeries.reduce((s, d) => s + d.hours * 60, 0);

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Trends across your applications and time."
        actions={<RangeFilter value={range} onChange={setRange} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Mini label="Total applications" value={totalApps} />
        <Mini label="Interview rate" value={`${interviewRate}%`} />
        <Mini label="Offer rate" value={`${offerRate}%`} />
        <Mini label="Time tracked" value={minutesToHm(totalMins)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">
            Applications over time
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={appsSeries} margin={{ left: -20, right: 8 }}>
              <defs>
                <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111113" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#111113" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ececef" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#ececef" }}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#d4d4d8" }} />
              <Area
                type="monotone"
                dataKey="Applications"
                stroke="#111113"
                strokeWidth={2}
                fill="url(#appsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">
            Status breakdown
          </h2>
          {statusData.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">
              No data in range.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statusData.map((d) => (
                      <Cell
                        key={d.status}
                        fill={STATUS_COLORS[d.status]}
                        stroke="#ffffff"
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {statusData.map((d) => (
                  <div
                    key={d.status}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: STATUS_COLORS[d.status] }}
                    />
                    <span className="text-neutral-500">{d.name}</span>
                    <span className="ml-auto font-medium text-neutral-800">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">
            Pipeline funnel
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#ececef" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f2f2f4" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {funnel.map((f) => (
                  <Cell key={f.stage} fill={f.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">
            Hours tracked per day
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeSeries} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke="#ececef" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={{ stroke: "#ececef" }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f2f2f4" }} />
              <Bar dataKey="hours" fill="#111113" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
