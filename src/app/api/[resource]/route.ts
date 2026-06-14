import { NextRequest, NextResponse } from "next/server";
import { coerceDates, db, isResource, POLICIES } from "@/lib/resources";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { resource: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isResource(params.resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  const policy = POLICIES[params.resource];
  if (policy?.create === "admin" && user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  delete body.id; // server assigns ids

  // Never trust a client-supplied owner: stamp it from the session.
  if (policy?.forceOwner) {
    body[policy.forceOwner.idField] = user.id;
    if (policy.forceOwner.nameField) body[policy.forceOwner.nameField] = user.name;
  }

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
