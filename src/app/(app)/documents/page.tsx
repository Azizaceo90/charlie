"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useData } from "@/lib/store";
import { Card, EmptyState, PageHeader } from "@/components/ui";

const RESUME_KEY = "career-ops:base-resume";

export default function DocumentsPage() {
  const { currentUser } = useData();
  const canAccess = currentUser?.title === "Application Specialist";

  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [applicantName, setApplicantName] = useState(currentUser?.name ?? "");
  const [resume, setResume] = useState("");
  const [resumeOut, setResumeOut] = useState("");
  const [coverOut, setCoverOut] = useState("");
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadingCover, setLoadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RESUME_KEY);
      if (saved) setResume(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (currentUser?.name && !applicantName) setApplicantName(currentUser.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.name]);

  if (!canAccess) {
    return (
      <EmptyState
        icon={<FileText className="h-10 w-10" />}
        title="Restricted"
        hint="The document studio is available to Application Specialists."
      />
    );
  }

  async function generate(kind: "resume" | "cover") {
    if (!jobDescription.trim() || !resume.trim()) {
      setError("Paste a job description and your base resume first.");
      return;
    }
    setError(null);
    try {
      localStorage.setItem(RESUME_KEY, resume);
    } catch {
      /* ignore */
    }
    if (kind === "resume") setLoadingResume(true);
    else setLoadingCover(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          jobTitle,
          jobCompany,
          jobDescription,
          resume,
          applicantName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
      } else if (kind === "resume") {
        setResumeOut(data.text ?? "");
      } else {
        setCoverOut(data.text ?? "");
      }
    } catch {
      setError("Could not reach the document service.");
    } finally {
      if (kind === "resume") setLoadingResume(false);
      else setLoadingCover(false);
    }
  }

  function generateBoth() {
    generate("resume");
    generate("cover");
  }

  return (
    <div>
      <PageHeader
        title="Document Studio"
        subtitle="Generate a tailored resume and cover letter from a job description."
      />

      <Card className="mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="label">Job title</label>
            <input
              className="input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Sales Development Representative"
            />
          </div>
          <div>
            <label className="label">Company</label>
            <input
              className="input"
              value={jobCompany}
              onChange={(e) => setJobCompany(e.target.value)}
              placeholder="e.g. Acme Inc."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="label">Job description</label>
            <textarea
              className="input min-h-[140px]"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here."
            />
          </div>
          <div>
            <label className="label">Applicant name</label>
            <input
              className="input"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="label">Base resume</label>
            <textarea
              className="input min-h-[160px]"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste the applicant's base resume. Saved locally so you don't have to retype it."
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="btn-primary"
            onClick={generateBoth}
            disabled={loadingResume || loadingCover}
          >
            {loadingResume || loadingCover ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate both
          </button>
          <button
            className="btn-ghost"
            onClick={() => generate("resume")}
            disabled={loadingResume}
          >
            Resume only
          </button>
          <button
            className="btn-ghost"
            onClick={() => generate("cover")}
            disabled={loadingCover}
          >
            Cover letter only
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OutputCard
          title="Tailored resume"
          text={resumeOut}
          loading={loadingResume}
          downloadTitle={`${applicantName} — Resume`}
          downloadFilename={`${applicantName.replace(/\s+/g, "_") || "resume"}_resume.pdf`}
        />
        <OutputCard
          title="Cover letter"
          text={coverOut}
          loading={loadingCover}
          downloadTitle={`${applicantName} — Cover Letter`}
          downloadFilename={`${applicantName.replace(/\s+/g, "_") || "cover"}_cover_letter.pdf`}
        />
      </div>
    </div>
  );
}

function OutputCard({
  title,
  text,
  loading,
  downloadTitle,
  downloadFilename,
}: {
  title: string;
  text: string;
  loading: boolean;
  downloadTitle: string;
  downloadFilename: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function download() {
    if (!text) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/documents/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: downloadTitle,
          text,
          filename: downloadFilename,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="btn-subtle text-xs"
            disabled={!text}
            title="Copy text"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={download}
            className="btn-primary text-xs"
            disabled={!text || downloading}
            title="Download as PDF"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-neutral-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
        </div>
      ) : text ? (
        <pre className="max-h-[480px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-bg-soft p-4 text-sm text-neutral-800">
          {text}
        </pre>
      ) : (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-neutral-400">
          Output will appear here.
        </div>
      )}
    </Card>
  );
}
