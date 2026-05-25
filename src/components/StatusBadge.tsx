import { ApplicantStage, ApplicationStatus } from "@/lib/types";

const APP_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-accent-blue/15 text-accent-blue",
  assessment: "bg-accent-purple/15 text-accent-purple",
  interview: "bg-accent-amber/15 text-accent-amber",
  offer: "bg-accent-green/15 text-accent-green",
  rejected: "bg-slate-500/15 text-slate-400",
};

const APP_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`chip ${APP_STYLES[status]}`}>{APP_LABELS[status]}</span>
  );
}

const STAGE_STYLES: Record<ApplicantStage, string> = {
  applied: "bg-accent-blue/15 text-accent-blue",
  screening: "bg-accent-teal/15 text-accent-teal",
  assessment: "bg-accent-purple/15 text-accent-purple",
  interview: "bg-accent-amber/15 text-accent-amber",
  offer: "bg-brand/15 text-brand-soft",
  hired: "bg-accent-green/15 text-accent-green",
  rejected: "bg-slate-500/15 text-slate-400",
};

export function StageBadge({ stage }: { stage: ApplicantStage }) {
  return (
    <span className={`chip capitalize ${STAGE_STYLES[stage]}`}>{stage}</span>
  );
}
