import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  source: "remotive" | "muse" | "adzuna" | "jsearch";
}

interface JSearchJob {
  job_id: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_apply_link?: string;
  job_description?: string;
  job_employment_type?: string;
  job_posted_at_datetime_utc?: string;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_is_remote?: boolean;
}

async function fetchJSearch(
  q: string,
  signal: AbortSignal
): Promise<{ jobs: NormalizedJob[]; status: string }> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return { jobs: [], status: "keys not set in Vercel" };
  if (!q) return { jobs: [], status: "empty query" };
  const COUNTRIES = ["us", "ca"] as const;
  const tasks = COUNTRIES.map(async (country) => {
    const url =
      `https://jsearch.p.rapidapi.com/search` +
      `?query=${encodeURIComponent(q + " remote")}` +
      `&page=1&num_pages=5&remote_jobs_only=true&country=${country}`;
    try {
      const r = await fetch(url, {
        signal,
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        return {
          ok: false as const,
          err: `${r.status} ${(e as { message?: string }).message ?? ""}`.trim(),
        };
      }
      const d = (await r.json()) as { data?: JSearchJob[] };
      const list = (d.data ?? []).map(
        (j): NormalizedJob => ({
          id: `jsearch-${j.job_id}`,
          title: j.job_title ?? "",
          company: j.employer_name ?? "Unknown",
          location:
            [j.job_city, j.job_state, country === "us" ? "United States" : "Canada"]
              .filter(Boolean)
              .join(", ") + (j.job_is_remote ? " · Remote" : ""),
          type: mapType(j.job_employment_type ?? ""),
          salary: formatSalary(
            j.job_min_salary ?? undefined,
            j.job_max_salary ?? undefined
          ),
          postedAt:
            j.job_posted_at_datetime_utc ?? new Date().toISOString(),
          url: j.job_apply_link ?? "",
          description: shortDesc(stripHtml(j.job_description ?? "")),
          source: "jsearch",
        })
      );
      return { ok: true as const, jobs: list };
    } catch (e) {
      return {
        ok: false as const,
        err: e instanceof Error ? e.message : "network error",
      };
    }
  });
  const results = await Promise.all(tasks);
  const jobs = results.flatMap((r) => (r.ok ? r.jobs : []));
  const firstErr = results.find((r) => !r.ok);
  if (jobs.length === 0) {
    return {
      jobs: [],
      status: firstErr ? `error: ${(firstErr as { err: string }).err}` : "no jobs returned",
    };
  }
  return { jobs, status: "ok" };
}

function formatSalary(min?: number, max?: number): string | undefined {
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `up to ${fmt(max)}`;
  return undefined;
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
  if (/medical cod|coding specialist|cpc|ccs|crc|risk adjust|medical bill|clinical cod|health information/.test(x))
    return "Healthcare";
  if (/engineer|developer|frontend|backend|fullstack|devops|sre/.test(x))
    return "Software Engineering";
  if (/designer|design|ux|ui/.test(x)) return "Design";
  if (/marketing|growth|brand|content/.test(x)) return "Marketing";
  if (/product manager|\bpm\b|product/.test(x)) return "Product";
  if (/data|analyst|analytics/.test(x)) return "Data Science";
  return null;
}

/** True when a job is remote AND explicitly open to US or Canada candidates. */
function isRemoteUsCanada(loc: string, _source: NormalizedJob["source"]): boolean {
  const x = (loc || "").trim().toLowerCase();
  if (!x) return false; // require an explicit US/CA signal
  // Reject locations that mention non-NA regions, even alongside "remote".
  if (
    /\b(emea|europe|eu only|latam|latin america|apac|asia|africa|australia|new zealand|middle east|india|brazil|argentina|mexico|colombia|chile|peru|uk only|ireland only|germany|france|italy|spain|netherlands|sweden|portugal|poland|romania|ukraine|israel|philippines|south africa)\b/.test(
      x
    )
  ) {
    return /\b(usa?|u\.s\.|united states|america|canada|north america|americas)\b/.test(
      x
    );
  }
  // Must explicitly mention US or Canada.
  return /\b(usa?|u\.s\.|united states|america|canada|north america|americas)\b/.test(
    x
  );
}

async function fetchRemotive(
  q: string,
  signal: AbortSignal
): Promise<NormalizedJob[]> {
  // For sales-family queries, pull the whole "sales-business" category for
  // breadth; otherwise use the keyword search.
  const isSales = museCategory(q) === "Sales";
  const url = isSales
    ? `https://remotive.com/api/remote-jobs?category=sales-business&limit=100`
    : `https://remotive.com/api/remote-jobs?limit=50${
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
  // Pull 10 pages to widen the pool (~200 results).
  const pages = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((page) =>
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
  // Medical-coding family.
  if (
    /medical cod|coding specialist|\bcpc\b|\bccs\b|\bcrc\b|risk adjust|medical bill|clinical cod|health information|\bhim\b/.test(
      x
    )
  ) {
    return [
      "medical coder",
      "medical coding",
      "coding specialist",
      "clinical coder",
      "clinical coding",
      "outpatient coder",
      "inpatient coder",
      "risk adjustment coder",
      "risk adjustment coding",
      "medical biller",
      "medical billing",
      "coding auditor",
      "him coder",
      "cpc",
      "ccs",
      "crc",
    ];
  }
  // Any sales-family search (SDR/BDR/founding/AE) accepts a broad family of
  // front-line sales titles.
  if (
    /\bsdr\b|\bbdr\b|sales development|business development|account exec|account manager|\bae\b|founding\s+(sdr|bdr|sales|ae|account)|inside sales|outside sales|sales rep/.test(
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
      "account manager",
      "inside sales",
      "outside sales",
      "outbound sales",
      "inbound sales",
      "sales representative",
      "sales rep",
      "sales associate",
      "sales consultant",
      "sales executive",
      "sales manager",
      "sales lead",
    ];
  }
  // Fallback: split into significant words.
  return x.split(/\s+/).filter((w) => w.length >= 3);
}

interface AdzunaJob {
  id: string | number;
  title?: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  contract_time?: string;
  contract_type?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string };
}

async function fetchAdzuna(
  q: string,
  signal: AbortSignal
): Promise<{ jobs: NormalizedJob[]; status: string }> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return { jobs: [], status: "keys not set in Vercel" };
  if (!q) return { jobs: [], status: "empty query" };

  const COUNTRIES = ["us", "ca"] as const;
  const PAGES = [1, 2, 3, 4, 5, 6, 7, 8];
  const tasks = COUNTRIES.flatMap((country) =>
    PAGES.map(async (page) => {
      // Search for "remote <query>" to bias toward remote postings; geo
      // filter is applied later, and we tag the location with the country.
      const url =
        `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
        `?app_id=${id}&app_key=${key}&results_per_page=50` +
        `&what=${encodeURIComponent("remote " + q)}&content-type=application/json`;
      try {
        const r = await fetch(url, { signal });
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          return {
            ok: false as const,
            err: `${r.status} ${
              (e as { exception?: string; error?: string }).exception ??
              (e as { error?: string }).error ??
              ""
            }`.trim(),
          };
        }
        const d = (await r.json()) as { results?: AdzunaJob[] };
        const list = (d.results ?? []).map(
          (j): NormalizedJob => ({
            id: `adzuna-${j.id}`,
            title: j.title ?? "",
            company: j.company?.display_name ?? "Unknown",
            location:
              (j.location?.display_name ?? "Remote") +
              ` · ${country === "us" ? "United States" : "Canada"}`,
            type: mapType(j.contract_time ?? j.contract_type ?? ""),
            salary: formatSalary(j.salary_min, j.salary_max),
            postedAt: j.created ?? new Date().toISOString(),
            url: j.redirect_url ?? "",
            description: shortDesc(stripHtml(j.description ?? "")),
            source: "adzuna",
          })
        );
        return { ok: true as const, jobs: list };
      } catch (e) {
        return {
          ok: false as const,
          err: e instanceof Error ? e.message : "network error",
        };
      }
    })
  );

  const results = await Promise.all(tasks);
  const jobs = results.flatMap((r) => (r.ok ? r.jobs : []));
  const firstErr = results.find((r) => !r.ok);
  if (jobs.length === 0) {
    return {
      jobs: [],
      status: firstErr
        ? `error: ${(firstErr as { err: string }).err}`
        : "no jobs returned",
    };
  }
  return { jobs, status: "ok" };
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
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const caughtErr = (e: unknown) =>
      ({
        jobs: [] as NormalizedJob[],
        status: e instanceof Error ? e.message : "caught error",
      }) as { jobs: NormalizedJob[]; status: string };
    const [remotive, muse, adzunaResult, jsearchResult] = await Promise.all([
      fetchRemotive(q, controller.signal).catch(() => []),
      fetchMuse(q, controller.signal).catch(() => []),
      fetchAdzuna(q, controller.signal).catch(caughtErr),
      fetchJSearch(q, controller.signal).catch(caughtErr),
    ]);
    const adzuna = adzunaResult.jobs;
    const jsearch = jsearchResult.jobs;

    // Merge + de-dupe by url (fall back to source+title+company).
    const seen = new Set<string>();
    const merged: NormalizedJob[] = [];
    for (const j of [...remotive, ...muse, ...adzuna, ...jsearch]) {
      const key = j.url || `${j.source}|${j.company}|${j.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(j);
    }

    // Drop results whose title doesn't actually match the search term — the
    // upstream APIs return a lot of loosely-related jobs.
    const keywords = buildKeywords(q);
    let filtered = merged.filter((j) => titleMatches(j.title, keywords));

    // Geo filter: only remote roles open to US or Canada candidates.
    filtered = filtered.filter((j) => isRemoteUsCanada(j.location, j.source));

    // Drop postings older than 90 days — they're usually stale or filled.
    const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((j) => {
      const t = new Date(j.postedAt).getTime();
      return !isNaN(t) && Date.now() - t < MAX_AGE_MS;
    });

    // Optional further substring filter from the user (city, etc.).
    if (loc)
      filtered = filtered.filter((j) => j.location.toLowerCase().includes(loc));

    // Sort newest first, then de-dupe by company + title so the same role
    // listed across multiple cities collapses to one entry.
    filtered.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
    const byRole = new Map<string, NormalizedJob>();
    for (const j of filtered) {
      const key = `${j.company.toLowerCase().trim()}|${j.title
        .toLowerCase()
        .trim()}`;
      if (!byRole.has(key)) byRole.set(key, j);
    }
    filtered = Array.from(byRole.values());

    return NextResponse.json({
      jobs: filtered.slice(0, 500),
      sources: {
        remotive: remotive.length,
        muse: muse.length,
        adzuna: adzuna.length,
        adzunaStatus: adzunaResult.status,
        jsearch: jsearch.length,
        jsearchStatus: jsearchResult.status,
      },
    });
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
