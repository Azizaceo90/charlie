import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seedDb";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded(prisma);

  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    users,
    applications,
    timeEntries,
    sops,
    contracts,
    applicants,
    listings,
    notifications,
    personalDocs,
    expenses,
    payroll,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        avatarColor: true,
        onboardingDone: true,
        // Payment info is sensitive — only include for admins so they can
        // pay people when approving timesheets.
        ...(me.role === "admin"
          ? { paymentMethod: true, paymentAccount: true, payRate: true }
          : {}),
      },
    }),
    prisma.jobApplication.findMany({ orderBy: { date: "desc" } }),
    prisma.timeEntry.findMany({ orderBy: { clockIn: "desc" } }),
    prisma.sopDoc.findMany({ orderBy: { uploadedAt: "desc" } }),
    prisma.contract.findMany({ orderBy: { issuedAt: "desc" } }),
    prisma.applicant.findMany({ orderBy: { appliedAt: "desc" } }),
    prisma.jobListing.findMany({ orderBy: { postedAt: "desc" } }),
    prisma.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.personalDoc.findMany({
      where: { userId: me.id },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.expense.findMany({
      where: me.role === "admin" ? {} : { userId: me.id },
      orderBy: { date: "desc" },
    }),
    prisma.payrollEntry.findMany({
      where: me.role === "admin" ? {} : { userId: me.id },
      orderBy: { periodStart: "desc" },
    }),
  ]);

  return NextResponse.json({
    users,
    applications,
    timeEntries,
    sops,
    contracts,
    applicants,
    listings,
    notifications,
    personalDocs,
    expenses,
    payroll,
    me: {
      fullLegalName: me.fullLegalName,
      dateOfBirth: me.dateOfBirth?.toISOString() ?? null,
      address: me.address,
      phone: me.phone,
      emergencyName: me.emergencyName,
      emergencyPhone: me.emergencyPhone,
      paymentMethod: me.paymentMethod,
      paymentAccount: me.paymentAccount,
      onboardingDone: me.onboardingDone,
      signature: me.signature,
    },
  });
}
