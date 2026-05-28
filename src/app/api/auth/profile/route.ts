import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    fullLegalName?: string | null;
    dateOfBirth?: string | null;
    address?: string | null;
    phone?: string | null;
    emergencyName?: string | null;
    emergencyPhone?: string | null;
  };

  const required = [
    body.fullLegalName,
    body.dateOfBirth,
    body.address,
    body.phone,
  ];
  const onboardingDone = required.every((v) => v && String(v).trim().length > 0);

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      fullLegalName: body.fullLegalName?.toString().trim() || null,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      address: body.address?.toString().trim() || null,
      phone: body.phone?.toString().trim() || null,
      emergencyName: body.emergencyName?.toString().trim() || null,
      emergencyPhone: body.emergencyPhone?.toString().trim() || null,
      onboardingDone,
    },
  });
  return NextResponse.json({ user: publicUser(updated) });
}
