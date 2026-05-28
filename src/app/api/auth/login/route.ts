import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicUser, setSessionCookie, verifyPassword } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seedDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSeeded(prisma);
  const { email, password } = (await req.json()) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });
  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }
  setSessionCookie(user.id);
  return NextResponse.json({ user: publicUser(user) });
}
