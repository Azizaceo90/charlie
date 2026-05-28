import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Facebook calls GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// to confirm we own the endpoint. Respond with the challenge if the token matches.
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (
    mode === "subscribe" &&
    token &&
    token === process.env.FACEBOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

interface LeadEntry {
  field_data?: Array<{ name?: string; values?: string[] }>;
  created_time?: string;
}

function findField(data: LeadEntry, names: string[]): string | undefined {
  for (const f of data.field_data ?? []) {
    if (f.name && names.some((n) => f.name!.toLowerCase().includes(n))) {
      return (f.values ?? [])[0];
    }
  }
  return undefined;
}

function verifySignature(raw: string, sig: string | null): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret) return true; // skip verification if no secret configured
  if (!sig?.startsWith("sha256=")) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  let payload: {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        field?: string;
        value?: {
          leadgen_id?: string;
          form_id?: string;
          page_id?: string;
          created_time?: number;
        };
      }>;
    }>;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const results: Array<{ leadgenId: string; ok: boolean; error?: string }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;
      try {
        if (!token) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN not set");
        const existing = await prisma.applicant.findUnique({
          where: { facebookLeadId: leadgenId },
        });
        if (existing) {
          results.push({ leadgenId, ok: true });
          continue;
        }
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${encodeURIComponent(
            token
          )}`
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Graph ${res.status}: ${t.slice(0, 80)}`);
        }
        const data = (await res.json()) as LeadEntry;
        const name =
          findField(data, ["full_name", "full name", "name"]) ?? "Unknown";
        const email = findField(data, ["email"]) ?? "unknown@example.com";
        const phone = findField(data, ["phone", "phone_number"]);
        const role =
          findField(data, ["job_title", "role", "position"]) ?? "Lead";
        const location = findField(data, ["city", "state", "location"]);
        await prisma.applicant.create({
          data: {
            name,
            email,
            role,
            stage: "applied",
            location,
            phone,
            source: "facebook",
            facebookLeadId: leadgenId,
            formData: JSON.stringify(data),
            appliedAt: data.created_time
              ? new Date(data.created_time)
              : new Date(),
          },
        });
        // Notify all admins.
        const admins = await prisma.user.findMany({
          where: { role: "admin" },
        });
        if (admins.length) {
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              type: "facebook_lead",
              title: `New Facebook lead: ${name}`,
              body: `${role}${location ? " · " + location : ""}`,
              link: "/applicants",
            })),
          });
        }
        results.push({ leadgenId, ok: true });
      } catch (e) {
        results.push({
          leadgenId,
          ok: false,
          error: e instanceof Error ? e.message : "fetch failed",
        });
      }
    }
  }
  return NextResponse.json({ ok: true, results });
}
