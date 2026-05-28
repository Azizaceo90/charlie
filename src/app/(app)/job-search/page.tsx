"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Send,
} from "lucide-react";
import { useData } from "@/lib/store";
import { JobListing } from "@/lib/types";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ago } from "@/lib/format";

interface LiveJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  postedAt: string;
  url: string;
  description: string;
}

const QUICK = [
  "SDR",
  "BDR",
  "Founding BDR",
  "Sales Development Representative",
  "Account Executive",
];

type Tab = "search" | "saved";

export default function JobSearchPage() {
  const { listings, addListing, updateListing, applications, addApplication } =
    useData();
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("Sales Development Representative");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const runSearch = useCallback(async (q: string, loc: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (loc.trim()) params.set("loc", loc.trim());
      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.jobs ?? []);
      if (data.error) setError(data.error);
    } catch {
      setError("Could not load jobs. Try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(query, location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query, location);
  }

  async function save(job: LiveJob) {
    if (savedIds.has(job.id)) return;
    setSavedIds((s) => new Set(s).add(job.id));
    await addListing({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type as JobListing["type"],
      salary: job.salary,
      postedAt: job.postedAt,
      saved: true,
      applied: appliedIds.has(job.id),
      description: job.description,
    });
  }

  async function apply(job: LiveJob) {
    if (appliedIds.has(job.id)) return;
    setAppliedIds((s) => new Set(s).add(job.id));
    await addApplication({
      company: job.company,
      role: job.title,
      status: "applied",
      date: new Date().toISOString(),
      source: "manual",
      location: job.location,
    });
    if (job.url) window.open(job.url, "_blank", "noopener");
  }

  const saved = listings.filter((l) => l.saved);

  return (
    <div>
      <PageHeader
        title="Job Search"
        subtitle="Search live job listings and apply in one click."
      />

      <div className="mb-5 flex gap-1 rounded-lg border border-line bg-bg-soft p-1">
        <TabBtn active={tab === "search"} onClick={() => setTab("search")}>
          Search
        </TabBtn>
        <TabBtn active={tab === "saved"} onClick={() => setTab("saved")}>
          Saved ({saved.length})
        </TabBtn>
      </div>

      {tab === "search" ? (
        <>
          <Card className="mb-4 p-4">
            <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  className="input pl-9"
                  placeholder="Search roles, e.g. SDR, BDR, Founding BDR"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="relative sm:w-56">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  className="input pl-9"
                  placeholder="Location (Remote, NYC…)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q);
                    runSearch(q, location);
                  }}
                  className="rounded-full border border-line bg-bg-card px-3 py-1 text-xs font-medium text-neutral-600 hover:border-brand hover:text-brand"
                >
                  {q}
                </button>
              ))}
            </div>
          </Card>

          {error && (
            <div className="mb-4 rounded-lg border border-accent-amber/40 bg-accent-amber/10 px-4 py-2.5 text-sm text-neutral-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching live
              listings…
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Search className="h-8 w-8" />}
              title="No live listings found"
              hint="Try a different role or one of the quick searches above."
            />
          ) : (
            <>
              <div className="mb-3 text-xs text-neutral-500">
                {results.length} live listings
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {results.map((j) => (
                  <LiveCard
                    key={j.id}
                    job={j}
                    saved={savedIds.has(j.id)}
                    applied={appliedIds.has(j.id)}
                    onSave={() => save(j)}
                    onApply={() => apply(j)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <SavedList
          saved={saved}
          onUnsave={(id) => updateListing(id, { saved: false })}
          onApply={(l) => {
            updateListing(l.id, { applied: true });
            addApplication({
              company: l.company,
              role: l.title,
              status: "applied",
              date: new Date().toISOString(),
              source: "manual",
              location: l.location,
            });
          }}
          appliedCompanies={new Set(applications.map((a) => a.company + a.role))}
        />
      )}
    </div>
  );
}

function LiveCard({
  job,
  saved,
  applied,
  onSave,
  onApply,
}: {
  job: LiveJob;
  saved: boolean;
  applied: boolean;
  onSave: () => void;
  onApply: () => void;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-soft text-sm font-bold text-neutral-700">
          {job.company.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold text-neutral-900 hover:text-brand"
          >
            <span className="truncate">{job.title}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          </a>
          <div className="truncate text-sm text-neutral-500">{job.company}</div>
        </div>
        <button
          onClick={onSave}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-bg-hover hover:text-brand"
          title={saved ? "Saved" : "Save"}
        >
          {saved ? (
            <BookmarkCheck className="h-5 w-5 text-brand" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="chip bg-bg-soft text-neutral-600">
          <MapPin className="h-3 w-3" /> {job.location}
        </span>
        <span className="chip bg-bg-soft text-neutral-600">{job.type}</span>
        {job.salary && (
          <span className="chip bg-bg-soft text-neutral-600">{job.salary}</span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-neutral-500">
        {job.description}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-neutral-400">Posted {ago(job.postedAt)}</span>
        {applied ? (
          <span className="chip bg-accent-green/15 text-accent-green">
            <Check className="h-3 w-3" /> Applied
          </span>
        ) : (
          <button className="btn-primary text-xs" onClick={onApply}>
            <Send className="h-3.5 w-3.5" /> Apply
          </button>
        )}
      </div>
    </Card>
  );
}

function SavedList({
  saved,
  onUnsave,
  onApply,
  appliedCompanies,
}: {
  saved: JobListing[];
  onUnsave: (id: string) => void;
  onApply: (l: JobListing) => void;
  appliedCompanies: Set<string>;
}) {
  if (saved.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="h-8 w-8" />}
        title="No saved jobs yet"
        hint="Save listings from the Search tab to keep them here."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {saved.map((l) => {
        const applied = l.applied || appliedCompanies.has(l.company + l.title);
        return (
          <Card key={l.id} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-soft text-sm font-bold text-neutral-700">
                {l.company.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-neutral-900">
                  {l.title}
                </div>
                <div className="truncate text-sm text-neutral-500">
                  {l.company}
                </div>
              </div>
              <button
                onClick={() => onUnsave(l.id)}
                className="rounded-md p-1.5 text-brand hover:bg-bg-hover"
                title="Remove from saved"
              >
                <BookmarkCheck className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="chip bg-bg-soft text-neutral-600">
                <MapPin className="h-3 w-3" /> {l.location}
              </span>
              <span className="chip bg-bg-soft text-neutral-600">{l.type}</span>
              {l.salary && (
                <span className="chip bg-bg-soft text-neutral-600">
                  {l.salary}
                </span>
              )}
            </div>
            <p className="mt-3 line-clamp-2 flex-1 text-sm text-neutral-500">
              {l.description}
            </p>
            <div className="mt-4 flex items-center justify-end">
              {applied ? (
                <span className="chip bg-accent-green/15 text-accent-green">
                  <Check className="h-3 w-3" /> Applied
                </span>
              ) : (
                <button className="btn-primary text-xs" onClick={() => onApply(l)}>
                  <Send className="h-3.5 w-3.5" /> Apply
                </button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-brand text-white" : "text-neutral-500 hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );
}
