import { ApplicantStage, ApplicationStatus } from "@/lib/types";

const APP_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-accent-blue",
  assessment: "bg-accent-purple",
  interview: "bg-accent-amber",
  offer: "bg-accent-green",
  rejected: "bg-accent-red",
};

const APP_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`pill ${APP_STYLES[status]}`}>{APP_LABELS[status]}</span>;
}

const STAGE_STYLES: Record<ApplicantStage, string> = {
  applied: "bg-accent-blue",
  screening: "bg-accent-teal",
  assessment: "bg-accent-purple",
  interview: "bg-accent-amber",
  offer: "bg-brand",
  hired: "bg-accent-green",
  rejected: "bg-accent-red",
};

export function StageBadge({ stage }: { stage: ApplicantStage }) {
  return <span className={`pill capitalize ${STAGE_STYLES[stage]}`}>{stage}</span>;
}
