import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, publicUser } from "@/lib/auth";
import { inviteEmailHtml, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLORS = ["#0073ea", "#00c875", "#fdab3d", "#a25ddc", "#e2445c", "#00d2d2"];

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { name, email, password, role, title } = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    title?: string;
  };
  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 }
    );
  }

  const count = await prisma.user.count();
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      role: role === "admin" ? "admin" : "employee",
      title: title?.trim() || null,
      avatarColor: COLORS[count % COLORS.length],
      passwordHash: await hashPassword(password),
    },
  });

  const result = await sendEmail({
    to: user.email,
    subject: "You've been invited to Career Ops",
    html: inviteEmailHtml({
      name: user.name,
      email: user.email,
      password,
      loginUrl: `${req.nextUrl.origin}/login`,
      inviter: admin.name,
    }),
  });

  return NextResponse.json(
    { user: publicUser(user), emailed: result.ok, emailError: result.error },
    { status: 201 }
  );
}
