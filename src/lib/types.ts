export type Role = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string | null;
  avatarColor?: string | null;
  fullLegalName?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  phone?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  paymentMethod?: string | null;
  paymentAccount?: string | null;
  onboardingDone?: boolean;
  /** Default hourly pay rate (USD). */
  payRate?: number | null;
  /** Comma-separated timesheet projects assigned to this employee. */
  projects?: string | null;
  /** Reusable saved signature (base64 PNG data URL). */
  signature?: string | null;
}

export interface PersonalDoc {
  id: string;
  userId: string;
  title: string;
  category?: string | null;
  fileName: string;
  dataUrl: string;
  sizeKb: number;
  uploadedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

// ── Job application tracking (from Gmail) ────────────────────────────────────
export type ApplicationStatus =
  | "applied"
  | "interview"
  | "assessment"
  | "offer"
  | "rejected";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  /** ISO date string of the most recent status update */
  date: string;
  source: "gmail" | "manual";
  emailSubject?: string;
  emailFrom?: string;
  location?: string;
}

// ── Time tracker ─────────────────────────────────────────────────────────────
export interface TimeEntry {
  id: string;
  userId: string;
  /** ISO datetime */
  clockIn: string;
  /** ISO datetime, undefined while running */
  clockOut?: string;
  project?: string;
  note?: string;
  chartsCoded?: number;
  claimsProcessed?: number;
  submittedAt?: string | null;
  approvedAt?: string | null;
}

// ── SOP documents ────────────────────────────────────────────────────────────
export interface SopDoc {
  id: string;
  title: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  fileName: string;
  /** base64 data URL of the PDF */
  dataUrl: string;
  sizeKb: number;
}

// ── Contracts ────────────────────────────────────────────────────────────────
export interface ContractField {
  id: string;
  type:
    | "name"
    | "date"
    | "signature"
    | "address"
    | "phone"
    | "email"
    | "country"
    | "issuerSignature";
  /** 1-based page index this field sits on */
  page: number;
  /** Position + size as a fraction of the page width/height (top-left origin). */
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
}

export function parseContractFields(json?: string | null): ContractField[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as ContractField[]) : [];
  } catch {
    return [];
  }
}

export interface Contract {
  id: string;
  title: string;
  /** employee user id this contract is assigned to */
  assignedToId: string;
  assignedToName: string;
  status: "pending" | "signed";
  fileName: string;
  dataUrl: string;
  /** JSON array of fillable field positions */
  fields?: string | null;
  issuedAt: string;
  signedAt?: string;
  /** ISO datetime of the last reminder email sent to the assignee */
  remindedAt?: string | null;
  /** base64 data URL of the drawn signature */
  signatureDataUrl?: string;
  signerName?: string;
}

// ── Payroll & Expenses ───────────────────────────────────────────────────────
export type ExpenseStatus = "pending" | "approved" | "reimbursed" | "rejected";

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  /** ISO date the expense was incurred */
  date: string;
  category: string;
  description?: string | null;
  amount: number;
  status: ExpenseStatus;
  /** base64 data URL of an uploaded receipt (PDF/image) */
  receiptUrl?: string | null;
  receiptName?: string | null;
  createdAt?: string;
}

export type PayrollStatus = "pending" | "paid";

export interface PayrollEntry {
  id: string;
  userId: string;
  userName: string;
  periodStart: string;
  periodEnd: string;
  hours: number;
  rate: number;
  gross: number;
  status: PayrollStatus;
  method?: string | null;
  note?: string | null;
  createdAt?: string;
  paidAt?: string | null;
}

// ── Applicants (hiring pipeline) ─────────────────────────────────────────────
export type ApplicantStage =
  | "applied"
  | "screening"
  | "interview"
  | "assessment"
  | "offer"
  | "hired"
  | "rejected";

export interface Applicant {
  id: string;
  name: string;
  email: string;
  role: string;
  stage: ApplicantStage;
  appliedAt: string;
  rating?: number;
  location?: string;
}

// ── Job search listings ──────────────────────────────────────────────────────
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote" | "Internship";
  salary?: string;
  postedAt: string;
  saved: boolean;
  applied: boolean;
  description: string;
}
