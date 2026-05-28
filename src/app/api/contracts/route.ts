import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { contractEmailHtml, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Issue a contract (admin) and notify the assigned employee.
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const body = (await req.json()) as Record<string, unknown>;
  delete body.id;

  const contract = await prisma.contract.create({
    data: {
      title: String(body.title ?? "Contract"),
      assignedToId: String(body.assignedToId),
      assignedToName: String(body.assignedToName ?? ""),
      status: "pending",
      fileName: String(body.fileName ?? "contract.pdf"),
      dataUrl: String(body.dataUrl ?? ""),
      issuedAt: body.issuedAt ? new Date(String(body.issuedAt)) : new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: contract.assignedToId,
      type: "contract_assigned",
      title: `New contract: ${contract.title}`,
      body: `${me.name} assigned you a contract to review and sign.`,
      link: "/contracts",
    },
  });

  // Second email: the contract to sign, with the PDF attached.
  const assignee = await prisma.user.findUnique({
    where: { id: contract.assignedToId },
  });
  let emailed = false;
  if (assignee) {
    const base64 = contract.dataUrl.split(",")[1] ?? "";
    emailed = await sendEmail({
      to: assignee.email,
      subject: `Contract to sign: ${contract.title}`,
      html: contractEmailHtml({
        name: assignee.name,
        contractTitle: contract.title,
        inviter: me.name,
        signUrl: `${req.nextUrl.origin}/contracts`,
      }),
      attachments: base64
        ? [{ filename: contract.fileName, content: base64 }]
        : undefined,
    });
  }

  return NextResponse.json({ ...contract, emailed }, { status: 201 });
}
