import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { contractReminderEmailHtml, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Re-send a "please sign" reminder to the assignee of a still-pending contract.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
  });
  if (!contract)
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  if (contract.status === "signed")
    return NextResponse.json(
      { error: "This contract is already signed." },
      { status: 400 }
    );

  const assignee = await prisma.user.findUnique({
    where: { id: contract.assignedToId },
  });
  if (!assignee)
    return NextResponse.json(
      { error: "The assigned person no longer exists." },
      { status: 404 }
    );

  const base64 = contract.dataUrl.split(",")[1] ?? "";
  const result = await sendEmail({
    to: assignee.email,
    subject: `Reminder: please sign "${contract.title}"`,
    html: contractReminderEmailHtml({
      name: assignee.name,
      contractTitle: contract.title,
      inviter: me.name,
      signUrl: `${req.nextUrl.origin}/contracts`,
      issuedAt: contract.issuedAt.toISOString(),
    }),
    attachments: base64
      ? [{ filename: contract.fileName, content: base64 }]
      : undefined,
  });

  // In-app reminder regardless of whether email is configured.
  await prisma.notification.create({
    data: {
      userId: contract.assignedToId,
      type: "contract_assigned",
      title: `Reminder: sign "${contract.title}"`,
      body: `${me.name} is waiting on your signature. Open Contracts to review and sign.`,
      link: "/contracts",
    },
  });

  const updated = await prisma.contract.update({
    where: { id: params.id },
    data: { remindedAt: new Date() },
  });

  return NextResponse.json({
    contract: updated,
    emailed: result.ok,
    error: result.ok ? undefined : result.error,
  });
}
