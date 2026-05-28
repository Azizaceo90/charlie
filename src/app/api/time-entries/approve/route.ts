import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function weekStartDate(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = (day + 6) % 7;
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { userId, weekStart } = (await req.json()) as {
    userId?: string;
    weekStart?: string;
  };
  if (!userId || !weekStart) {
    return NextResponse.json(
      { error: "userId and weekStart required." },
      { status: 400 }
    );
  }

  const start = weekStartDate(new Date(weekStart));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const result = await prisma.timeEntry.updateMany({
    where: {
      userId,
      clockIn: { gte: start, lt: end },
      submittedAt: { not: null },
      approvedAt: null,
    },
    data: { approvedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({
      approved: 0,
      message: "No submitted entries to approve.",
    });
  }

  const employee = await prisma.user.findUnique({ where: { id: userId } });
  if (employee) {
    const label = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    await prisma.notification.create({
      data: {
        userId: employee.id,
        type: "timesheet_approved",
        title: "Your timesheet was approved",
        body: `Week of ${label} · ${result.count} entries approved by ${admin.name}.`,
        link: "/time-tracker",
      },
    });
  }

  const updated = await prisma.timeEntry.findMany({
    where: { userId, clockIn: { gte: start, lt: end } },
  });
  return NextResponse.json({
    approved: result.count,
    weekStart: start.toISOString(),
    entries: updated,
  });
}
