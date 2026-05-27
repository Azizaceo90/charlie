import { ApplicantStage, ApplicationStatus } from "@/lib/types";

const APP_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-neutral-100 text-neutral-600",
  assessment: "bg-neutral-200 text-neutral-700",
  interview: "bg-neutral-200 text-neutral-900",
  offer: "bg-neutral-900 text-white",
  rejected: "bg-neutral-100 text-neutral-400",
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
  applied: "bg-neutral-100 text-neutral-600",
  screening: "bg-neutral-100 text-neutral-700",
  assessment: "bg-neutral-200 text-neutral-700",
  interview: "bg-neutral-200 text-neutral-900",
  offer: "bg-neutral-800 text-white",
  hired: "bg-neutral-900 text-white",
  rejected: "bg-neutral-100 text-neutral-400",
};

export function StageBadge({ stage }: { stage: ApplicantStage }) {
  return (
    <span className={`chip capitalize ${STAGE_STYLES[stage]}`}>{stage}</span>
  );
}
