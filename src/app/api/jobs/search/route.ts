import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  postedAt: string;
  url: string;
  description: string;
  source: "remotive" | "muse";
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

function shortDesc(s: string): string {
  return s.length > 240 ? s.slice(0, 240) + "…" : s;
}

function mapType(t: string): string {
  const v = (t || "").toLowerCase();
  if (v.includes("part")) return "Part-time";
  if (v.includes("contract")) return "Contract";
  if (v.includes("intern")) return "Internship";
  return "Full-time";
}

/** Pick a Muse category from the search query so we get relevant non-remote jobs too. */
function museCategory(q: string): string | null {
  const x = q.toLowerCase();
  if (/sdr|bdr|sales|account exec|business dev|founding/.test(x)) return "Sales";
  if (/engineer|developer|frontend|backend|fullstack|devops|sre/.test(x))
    return "Software Engineering";
  if (/designer|design|ux|ui/.test(x)) return "Design";
  if (/marketing|growth|brand|content/.test(x)) return "Marketing";
  if (/product manager|\bpm\b|product/.test(x)) return "Product";
  if (/data|analyst|analytics/.test(x)) return "Data Science";
  return null;
}

async function fetchRemotive(
  q: string,
  signal: AbortSignal
): Promise<NormalizedJob[]> {
  const url = `https://remotive.com/api/remote-jobs?limit=50${
    q ? `&search=${encodeURIComponent(q)}` : ""
  }`;
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "career-ops-dashboard" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      url: string;
      title: string;
      company_name: string;
      job_type: string;
      candidate_required_location: string;
      salary: string;
      publication_date: string;
      description: string;
    }>;
  };
  return (data.jobs ?? []).map((j) => ({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    type: mapType(j.job_type),
    salary: j.salary || undefined,
    postedAt: j.publication_date,
    url: j.url,
    description: shortDesc(stripHtml(j.description || "")),
    source: "remotive",
  }));
}

async function fetchMuse(
  q: string,
  signal: AbortSignal
): Promise<NormalizedJob[]> {
  const category = museCategory(q);
  if (!category) return [];
  // Pull two pages in parallel to get ~40 results.
  const pages = await Promise.all(
    [0, 1].map((page) =>
      fetch(
        `https://www.themuse.com/api/public/jobs?category=${encodeURIComponent(category)}&page=${page}`,
        { signal }
      )
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .catch(() => ({ results: [] }))
    )
  );
  const out: NormalizedJob[] = [];
  for (const page of pages) {
    for (const j of (page.results ?? []) as Array<{
      id: number;
      name: string;
      type: string;
      contents: string;
      publication_date: string;
      refs?: { landing_page?: string };
      company?: { name?: string };
      locations?: Array<{ name?: string }>;
    }>) {
      out.push({
        id: `muse-${j.id}`,
        title: j.name ?? "",
        company: j.company?.name ?? "Unknown",
        location: j.locations?.[0]?.name ?? "—",
        type: mapType(j.type),
        postedAt: j.publication_date,
        url: j.refs?.landing_page ?? "",
        description: shortDesc(stripHtml(j.contents ?? "")),
        source: "muse",
      });
    }
  }
  return out;
}

/** Expand a query into match keywords so SDR ↔ Sales Development etc. */
function buildKeywords(q: string): string[] {
  const x = q.toLowerCase().trim();
  if (!x) return [];
  // Any sales-family search (SDR/BDR/founding/AE) accepts the whole family.
  if (
    /\bsdr\b|\bbdr\b|sales development|business development|account exec|\bae\b|founding\s+(sdr|bdr|sales|ae|account)/.test(
      x
    )
  ) {
    return [
      "sdr",
      "bdr",
      "sales development",
      "business development",
      "sales dev",
      "biz dev",
      "account executive",
      "account exec",
    ];
  }
  // Fallback: split into significant words.
  return x.split(/\s+/).filter((w) => w.length >= 3);
}

function titleMatches(title: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const t = title.toLowerCase();
  return keywords.some((k) => {
    if (k.length <= 3) return new RegExp(`\\b${k}\\b`, "i").test(t);
    return t.includes(k);
  });
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const loc = (req.nextUrl.searchParams.get("loc") || "").trim().toLowerCase();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const [remotive, muse] = await Promise.all([
      fetchRemotive(q, controller.signal).catch(() => []),
      fetchMuse(q, controller.signal).catch(() => []),
    ]);

    // Merge + de-dupe by url (fall back to source+title+company).
    const seen = new Set<string>();
    const merged: NormalizedJob[] = [];
    for (const j of [...remotive, ...muse]) {
      const key = j.url || `${j.source}|${j.company}|${j.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(j);
    }

    // Drop results whose title doesn't actually match the search term — the
    // upstream APIs return a lot of loosely-related jobs.
    const keywords = buildKeywords(q);
    let filtered = merged.filter((j) => titleMatches(j.title, keywords));

    // Optional location filter (substring, case-insensitive).
    if (loc)
      filtered = filtered.filter((j) => j.location.toLowerCase().includes(loc));

    filtered.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));

    return NextResponse.json({ jobs: filtered.slice(0, 80) });
  } catch (err) {
    return NextResponse.json(
      {
        jobs: [],
        error:
          err instanceof Error && err.name === "AbortError"
            ? "Job search timed out. Try again."
            : "Could not reach the job boards. Try again in a moment.",
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
