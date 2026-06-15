import { NextRequest, NextResponse } from "next/server";
import { coerceDates, db, isResource, POLICIES } from "@/lib/resources";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Notify admins when an expense is submitted for review.
    if (params.resource === "expenses") {
      try {
        const admins = await prisma.user.findMany({
          where: { role: "admin", NOT: { id: user.id } },
          select: { id: true },
        });
        if (admins.length) {
          const amt =
            typeof created.amount === "number"
              ? `$${created.amount.toFixed(2)} `
              : "an ";
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              type: "expense_submitted",
              title: `${created.userName} submitted ${amt}expense`,
              body: `${created.category ?? "Expense"} — review it in Payroll & Expenses.`,
              link: "/payroll",
            })),
          });
        }
      } catch {
        /* notifications are best-effort */
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 400 }
    );
  }
}
