import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Monday 00:00 in local time for the given date. */
function weekStart(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // distance back to Monday
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!me.paymentMethod || !me.paymentAccount) {
    return NextResponse.json(
      {
        error:
          "Add a payment method in My Account before submitting a timesheet.",
      },
      { status: 400 }
    );
  }
  const { weekStart: weekStartIso } = (await req.json().catch(() => ({}))) as {
    weekStart?: string;
  };

  const start = weekStartIso ? weekStart(new Date(weekStartIso)) : weekStart(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const result = await prisma.timeEntry.updateMany({
    where: {
      userId: me.id,
      clockIn: { gte: start, lt: end },
      submittedAt: null,
      // Skip still-running entries (no clockOut yet).
      clockOut: { not: null },
    },
    data: { submittedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({
      submitted: 0,
      message: "No new entries to submit this week.",
    });
  }

  // Notify all admins.
  const admins = await prisma.user.findMany({ where: { role: "admin" } });
  if (admins.length) {
    const label = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "timesheet_submitted",
        title: `${me.name} submitted a timesheet`,
        body: `Week of ${label} · ${result.count} entries`,
        link: "/insights",
      })),
    });
  }

  // Return the updated entries so the client can refresh state.
  const updated = await prisma.timeEntry.findMany({
    where: { userId: me.id, clockIn: { gte: start, lt: end } },
  });
  return NextResponse.json({
    submitted: result.count,
    weekStart: start.toISOString(),
    entries: updated,
  });
}
