"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  MapPin,
  Search,
  Send,
} from "lucide-react";
import { useData } from "@/lib/store";
import { JobListing } from "@/lib/types";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { ago } from "@/lib/format";

type Tab = "all" | "saved" | "applied";

const TYPES = ["All", "Full-time", "Part-time", "Contract", "Remote", "Internship"];

export default function JobSearchPage() {
  const { listings, updateListing, addApplication } = useData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (tab === "saved" && !l.saved) return false;
      if (tab === "applied" && !l.applied) return false;
      if (type !== "All" && l.type !== type) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    });
  }, [listings, query, type, tab]);

  function toggleSave(listing: JobListing) {
    updateListing(listing.id, { saved: !listing.saved });
  }

  async function apply(listing: JobListing) {
    if (listing.applied) return;
    await updateListing(listing.id, { applied: true });
    await addApplication({
      company: listing.company,
      role: listing.title,
      status: "applied",
      date: new Date().toISOString(),
      source: "manual",
      location: listing.location,
    });
  }

  const savedCount = listings.filter((l) => l.saved).length;
  const appliedCount = listings.filter((l) => l.applied).length;

  return (
    <div>
      <PageHeader
        title="Job Search"
        subtitle="Browse roles, save the ones you like, and apply in one click."
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="input pl-9"
              placeholder="Search title, company, or location"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-48"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="mb-5 flex gap-1 rounded-lg border border-line bg-bg-soft p-1">
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
          All roles ({listings.length})
        </TabBtn>
        <TabBtn active={tab === "saved"} onClick={() => setTab("saved")}>
          Saved ({savedCount})
        </TabBtn>
        <TabBtn active={tab === "applied"} onClick={() => setTab("applied")}>
          Applied ({appliedCount})
        </TabBtn>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="No roles match"
          hint="Adjust your search or filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((l) => (
            <Card key={l.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-soft text-sm font-semibold text-slate-300">
                  {l.company.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">{l.title}</div>
                  <div className="text-sm text-slate-400">{l.company}</div>
                </div>
                <button
                  onClick={() => toggleSave(l)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-bg-hover hover:text-brand-soft"
                  title={l.saved ? "Unsave" : "Save"}
                >
                  {l.saved ? (
                    <BookmarkCheck className="h-5 w-5 text-brand-soft" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="chip bg-bg-soft text-slate-300">
                  <MapPin className="h-3 w-3" /> {l.location}
                </span>
                <span className="chip bg-bg-soft text-slate-300">{l.type}</span>
                {l.salary && (
                  <span className="chip bg-bg-soft text-slate-300">
                    {l.salary}
                  </span>
                )}
              </div>

              <p className="mt-3 line-clamp-2 flex-1 text-sm text-slate-400">
                {l.description}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Posted {ago(l.postedAt)}
                </span>
                {l.applied ? (
                  <span className="chip bg-accent-green/15 text-accent-green">
                    <Check className="h-3 w-3" /> Applied
                  </span>
                ) : (
                  <button className="btn-primary text-xs" onClick={() => apply(l)}>
                    <Send className="h-3.5 w-3.5" /> Apply
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
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
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-brand text-white" : "text-slate-400 hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );
}
