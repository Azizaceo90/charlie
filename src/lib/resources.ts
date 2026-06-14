import { prisma } from "./prisma";

// Maps a public REST resource name to its Prisma model and the fields that
// must be coerced from ISO strings back into Date objects on write.
export const RESOURCES = {
  applications: { model: "jobApplication", dates: ["date"] },
  "time-entries": { model: "timeEntry", dates: ["clockIn", "clockOut"] },
  sops: { model: "sopDoc", dates: ["uploadedAt"] },
  contracts: { model: "contract", dates: ["issuedAt", "signedAt"] },
  applicants: { model: "applicant", dates: ["appliedAt"] },
  listings: { model: "jobListing", dates: ["postedAt"] },
  expenses: { model: "expense", dates: ["date"] },
  payroll: { model: "payrollEntry", dates: ["periodStart", "periodEnd", "paidAt"] },
} as const;

export type ResourceKey = keyof typeof RESOURCES;

export function isResource(key: string): key is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCES, key);
}

export function coerceDates(
  resource: ResourceKey,
  data: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...data };
  for (const field of RESOURCES[resource].dates) {
    const v = out[field];
    if (typeof v === "string") out[field] = new Date(v);
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(resource: ResourceKey): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[RESOURCES[resource].model];
}
