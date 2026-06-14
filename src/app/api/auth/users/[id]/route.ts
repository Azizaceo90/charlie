import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const body = (await req.json()) as {
    name?: string;
    email?: string;
    title?: string | null;
    role?: string;
    payRate?: number | null;
  };
  // Prevent admin from demoting themselves to a non-admin.
  if (admin.id === params.id && body.role && body.role !== "admin") {
    return NextResponse.json(
      { error: "You can't change your own role." },
      { status: 400 }
    );
  }
  if (body.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: body.email.trim(), mode: "insensitive" },
        NOT: { id: params.id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with that email already exists." },
        { status: 409 }
      );
    }
  }
  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim() || undefined,
        email: body.email?.trim() || undefined,
        title: body.title === undefined ? undefined : body.title?.trim() || null,
        role:
          body.role === "admin" || body.role === "employee"
            ? body.role
            : undefined,
        payRate:
          body.payRate === undefined
            ? undefined
            : body.payRate === null
              ? null
              : Number(body.payRate),
      },
    });
    return NextResponse.json({ user: publicUser(updated) });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (admin.id === params.id)
    return NextResponse.json(
      { error: "You can't delete your own account." },
      { status: 400 }
    );

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}
