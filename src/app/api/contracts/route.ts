import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { contractEmailHtml, sendEmail } from "@/lib/email";
import { parseContractFields } from "@/lib/types";
import { stampFieldsInPdf } from "@/lib/pdfSign";

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

  // Split the placed fields: the issuer's own signature is stamped into the
  // PDF now (at issue time); the rest are left for the employee to fill.
  const allFields =
    typeof body.fields === "string"
      ? parseContractFields(body.fields)
      : Array.isArray(body.fields)
        ? parseContractFields(JSON.stringify(body.fields))
        : [];
  const issuerFields = allFields.filter((f) => f.type === "issuerSignature");
  const employeeFields = allFields.filter((f) => f.type !== "issuerSignature");

  let dataUrl = String(body.dataUrl ?? "");
  if (issuerFields.length > 0 && me.signature) {
    // Reuse the field stamper, treating each issuer slot as a signature image.
    const signatureFields = issuerFields.map((f) => ({
      ...f,
      type: "signature" as const,
    }));
    const values = Object.fromEntries(
      issuerFields.map((f) => [f.id, me.signature as string])
    );
    dataUrl = await stampFieldsInPdf(dataUrl, signatureFields, values);
  }

  const fieldsValue = employeeFields.length
    ? JSON.stringify(employeeFields)
    : null;

  const contract = await prisma.contract.create({
    data: {
      title: String(body.title ?? "Contract"),
      assignedToId: String(body.assignedToId),
      assignedToName: String(body.assignedToName ?? ""),
      status: "pending",
      fileName: String(body.fileName ?? "contract.pdf"),
      dataUrl,
      originalDataUrl: dataUrl,
      fields: fieldsValue,
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
    const result = await sendEmail({
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
    emailed = result.ok;
  }

  return NextResponse.json({ ...contract, emailed }, { status: 201 });
}
