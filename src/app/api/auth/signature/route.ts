import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save (or clear) the user's reusable "built-in" signature. Pass a PNG data
// URL to store it, or null/"" to remove it.
export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { signature } = (await req.json()) as { signature?: string | null };

  const value =
    typeof signature === "string" && signature.startsWith("data:image/")
      ? signature
      : null;

  if (value && value.length > 2_000_000) {
    return NextResponse.json(
      { error: "Signature image is too large." },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: { signature: value },
  });

  return NextResponse.json({ user: publicUser(updated) });
}
