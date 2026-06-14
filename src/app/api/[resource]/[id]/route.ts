import { NextRequest, NextResponse } from "next/server";
import { coerceDates, db, isResource, POLICIES } from "@/lib/resources";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { resource: string; id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isResource(params.resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const policy = POLICIES[params.resource];
  if (user.role !== "admin" && policy?.update) {
    if (policy.update === "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }
    if (policy.update === "owner") {
      const rec = await db(params.resource).findUnique({
        where: { id: params.id },
      });
      if (!rec || rec[policy.ownerField ?? "userId"] !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const body = (await req.json()) as Record<string, unknown>;
  delete body.id;
  try {
    const updated = await db(params.resource).update({
      where: { id: params.id },
      data: coerceDates(params.resource, body),
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { resource: string; id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isResource(params.resource)) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const policy = POLICIES[params.resource];
  if (user.role !== "admin" && policy?.delete) {
    if (policy.delete === "admin") {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }
    if (policy.delete === "owner") {
      const rec = await db(params.resource).findUnique({
        where: { id: params.id },
      });
      if (!rec || rec[policy.ownerField ?? "userId"] !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        policy.ownerDeleteStatuses &&
        !policy.ownerDeleteStatuses.includes(rec.status)
      ) {
        return NextResponse.json(
          { error: "Can only delete while pending." },
          { status: 403 }
        );
      }
    }
  }

  try {
    await db(params.resource).delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 400 }
    );
  }
}
