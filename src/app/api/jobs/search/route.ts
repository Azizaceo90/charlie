import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  job_type: string;
  candidate_required_location: string;
  salary: string;
  publication_date: string;
  description: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mapType(t: string): string {
  const v = (t || "").toLowerCase();
  if (v.includes("part")) return "Part-time";
  if (v.includes("contract")) return "Contract";
  if (v.includes("intern")) return "Internship";
  return "Full-time";
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const url = `https://remotive.com/api/remote-jobs?limit=50${
      q ? `&search=${encodeURIComponent(q)}` : ""
    }`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "career-ops-dashboard" },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const data = (await res.json()) as { jobs?: RemotiveJob[] };

    const jobs = (data.jobs ?? []).map((j) => {
      const desc = stripHtml(j.description || "");
      return {
        id: `remotive-${j.id}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        type: mapType(j.job_type),
        salary: j.salary || undefined,
        postedAt: j.publication_date,
        url: j.url,
        description: desc.length > 240 ? desc.slice(0, 240) + "…" : desc,
      };
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      {
        jobs: [],
        error:
          err instanceof Error && err.name === "AbortError"
            ? "Job search timed out. Try again."
            : "Could not reach the job board. Try again in a moment.",
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
