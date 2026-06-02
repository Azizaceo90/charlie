import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const contract = await prisma.contract.findUnique({ where: { id: params.id } });
  if (!contract)
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  // Restore the original unsigned PDF if we have it saved.
  const restoredDataUrl = contract.originalDataUrl ?? contract.dataUrl;
  const updated = await prisma.contract.update({
    where: { id: params.id },
    data: {
      status: "pending",
      signedAt: null,
      signatureDataUrl: null,
      signerName: null,
      dataUrl: restoredDataUrl,
    },
  });

  await prisma.notification.create({
    data: {
      userId: contract.assignedToId,
      type: "contract_assigned",
      title: `Contract re-opened: ${contract.title}`,
      body: `${admin.name} re-opened this contract. Please review and sign again.`,
      link: "/contracts",
    },
  });

  return NextResponse.json(updated);
}
