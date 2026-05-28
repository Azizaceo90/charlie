import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signSession(userId: string): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const { uid, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return typeof uid === "string" ? uid : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(userId: string) {
  cookies().set(COOKIE, signSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE)?.value;
  const uid = verifySession(token);
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  avatarColor: string | null;
}

export function publicUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  avatarColor: string | null;
}): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title,
    avatarColor: u.avatarColor,
  };
}
