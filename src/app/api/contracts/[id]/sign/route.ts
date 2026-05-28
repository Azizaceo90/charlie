import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { stampSignature } from "@/lib/pdfSign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { signatureDataUrl, fullName, address, phone } = (await req.json()) as {
    signatureDataUrl?: string;
    fullName?: string;
    address?: string;
    phone?: string;
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
  const stamped = await stampSignature(
    contract.dataUrl,
    signatureDataUrl,
    signer,
    {
      fullName: fullName?.trim() || me.name,
      address: address?.trim(),
      phone: phone?.trim(),
    }
  );

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
