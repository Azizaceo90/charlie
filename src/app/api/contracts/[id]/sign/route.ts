import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { stampFieldsInPdf, stampSignature } from "@/lib/pdfSign";
import { parseContractFields } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { signatureDataUrl, fullName, address, phone, fieldValues } =
    (await req.json()) as {
      signatureDataUrl?: string;
      fullName?: string;
      address?: string;
      phone?: string;
      fieldValues?: Record<string, string>;
    };
  if (!signatureDataUrl) {
    return NextResponse.json({ error: "Signature is required." }, { status: 400 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
  });
  if (!contract)
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  if (contract.assignedToId !== me.id)
    return NextResponse.json(
      { error: "Only the assigned employee can sign this contract." },
      { status: 403 }
    );
  if (contract.status === "signed")
    return NextResponse.json(contract);

  const signer = fullName?.trim() || me.name;

  // If the contract has placed fields, stamp those at their positions; the
  // legacy block at the bottom is appended only when there are no fields.
  const placed = parseContractFields(contract.fields);
  let stamped = contract.dataUrl;
  if (placed.length > 0 && fieldValues) {
    stamped = await stampFieldsInPdf(stamped, placed, fieldValues);
  } else {
    stamped = await stampSignature(stamped, signatureDataUrl, signer, {
      fullName: fullName?.trim() || me.name,
      address: address?.trim(),
      phone: phone?.trim(),
    });
  }

  const updated = await prisma.contract.update({
    where: { id: params.id },
    data: {
      status: "signed",
      signedAt: new Date(),
      signatureDataUrl,
      signerName: signer,
      dataUrl: stamped,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "admin" } });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "contract_signed",
        title: `${me.name} signed "${contract.title}"`,
        body: "Open Contracts to view the signed document.",
        link: "/contracts",
      })),
    });
  }

  return NextResponse.json(updated);
}
