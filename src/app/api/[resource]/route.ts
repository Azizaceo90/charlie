import { NextRequest, NextResponse } from "next/server";
import { coerceDates, db, isResource } from "@/lib/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { resource: string } }
) {
  if (!isResource(params.resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  delete body.id; // server assigns ids
  try {
    const created = await db(params.resource).create({
      data: coerceDates(params.resource, body),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 400 }
    );
  }
}
