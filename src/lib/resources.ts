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

/**
 * Per-resource write authorization. Resources not listed here keep the default
 * "any authenticated user" behavior. Admins always pass. "owner" means the
 * acting user must own the record (record[ownerField] === user.id).
 */
export interface ResourcePolicy {
  create?: "admin";
  update?: "admin" | "owner";
  delete?: "admin" | "owner";
  /** Field on the record holding the owning user id (for owner checks). */
  ownerField?: string;
  /** On create, overwrite these fields with the acting user's id/name. */
  forceOwner?: { idField: string; nameField?: string };
  /** When a non-admin owner deletes, the record's status must be one of these. */
  ownerDeleteStatuses?: string[];
}

export const POLICIES: Partial<Record<ResourceKey, ResourcePolicy>> = {
  expenses: {
    update: "admin", // only admins change status (approve/reimburse/reject)
    delete: "owner", // owner may delete their own while pending; admins always
    ownerField: "userId",
    forceOwner: { idField: "userId", nameField: "userName" },
    ownerDeleteStatuses: ["pending"],
  },
  payroll: { create: "admin", update: "admin", delete: "admin" },
};

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
