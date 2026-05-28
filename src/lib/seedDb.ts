import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SAMPLE_USERS } from "./sampleData";

/** Default password for the seeded demo accounts. */
export const DEMO_PASSWORD = "careerops";

/** Seeds the database only if it is empty. Safe to call on every request. */
export async function ensureSeeded(prisma: PrismaClient) {
  if ((await prisma.user.count()) === 0) {
    await seedDatabase(prisma);
    return;
  }
  // Backfill: older accounts were created before passwords existed.
  const missing = await prisma.user.count({ where: { passwordHash: null } });
  if (missing > 0) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await prisma.user.updateMany({
      where: { passwordHash: null },
      data: { passwordHash },
    });
  }
  // One-time cleanup: remove the previously seeded fake data (sample rows
  // had predictable id prefixes; real ones use cuids that start with "cm").
  await prisma.timeEntry.deleteMany({ where: { id: { startsWith: "u-" } } });
  await prisma.jobApplication.deleteMany({ where: { id: { startsWith: "app-" } } });
  await prisma.applicant.deleteMany({ where: { id: { startsWith: "applicant-" } } });
  await prisma.contract.deleteMany({ where: { id: { startsWith: "contract-" } } });
  await prisma.sopDoc.deleteMany({ where: { id: { startsWith: "sop-" } } });
  await prisma.jobListing.deleteMany({ where: { id: { startsWith: "listing-" } } });
  // Demo employees Maya / Devon (rarely needed once the admin is set up).
  await prisma.user.deleteMany({ where: { id: { in: ["u-emp-1", "u-emp-2"] } } });
}

/** Seeds a fresh database with the admin user only. */
export async function seedDatabase(prisma: PrismaClient) {
  await prisma.user.deleteMany();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const admin = SAMPLE_USERS.find((u) => u.role === "admin");
  if (admin) {
    await prisma.user.create({ data: { ...admin, passwordHash } });
  }
}
