import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, category, fileName, dataUrl, sizeKb } = (await req.json()) as {
    title?: string;
    category?: string;
    fileName?: string;
    dataUrl?: string;
    sizeKb?: number;
  };
  if (!title || !fileName || !dataUrl) {
    return NextResponse.json(
      { error: "Title, fileName and dataUrl are required." },
      { status: 400 }
    );
  }
  const doc = await prisma.personalDoc.create({
    data: {
      userId: me.id,
      title: title.trim(),
      category: category?.toString().trim() || null,
      fileName,
      dataUrl,
      sizeKb: sizeKb ?? Math.round(dataUrl.length / 1024),
    },
  });
  return NextResponse.json(doc, { status: 201 });
}
