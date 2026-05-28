import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  SAMPLE_USERS,
  sampleApplicants,
  sampleApplications,
  sampleContracts,
  sampleListings,
  sampleSops,
  sampleTimeEntries,
} from "./sampleData";

/** Default password for the seeded demo accounts. */
export const DEMO_PASSWORD = "careerops";

/** Seeds the database only if it is empty. Safe to call on every request. */
export async function ensureSeeded(prisma: PrismaClient) {
  if ((await prisma.user.count()) === 0) {
    await seedDatabase(prisma);
    return;
  }
  // Backfill: older accounts were created before passwords existed. Give any
  // password-less account the demo password so they can sign in (one-time).
  const missing = await prisma.user.count({ where: { passwordHash: null } });
  if (missing > 0) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await prisma.user.updateMany({
      where: { passwordHash: null },
      data: { passwordHash },
    });
  }
}

/**
 * Loads the sample dataset into the database. Clears existing rows first so it
 * is safe to re-run. Used by the `db:seed` script and by the bootstrap API to
 * auto-populate a fresh (empty) deployment.
 */
export async function seedDatabase(prisma: PrismaClient) {
  await prisma.timeEntry.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.applicant.deleteMany();
  await prisma.jobListing.deleteMany();
  await prisma.sopDoc.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of SAMPLE_USERS) {
    await prisma.user.create({ data: { ...u, passwordHash } });
  }

  for (const a of sampleApplications()) {
    await prisma.jobApplication.create({ data: { ...a, date: new Date(a.date) } });
  }

  for (const userId of ["u-admin", "u-emp-1", "u-emp-2"]) {
    for (const e of sampleTimeEntries(userId)) {
      await prisma.timeEntry.create({
        data: {
          id: e.id,
          userId: e.userId,
          clockIn: new Date(e.clockIn),
          clockOut: e.clockOut ? new Date(e.clockOut) : null,
          project: e.project,
          note: e.note,
        },
      });
    }
  }

  for (const s of sampleSops()) {
    await prisma.sopDoc.create({ data: { ...s, uploadedAt: new Date(s.uploadedAt) } });
  }

  for (const c of sampleContracts()) {
    await prisma.contract.create({
      data: {
        ...c,
        issuedAt: new Date(c.issuedAt),
        signedAt: c.signedAt ? new Date(c.signedAt) : null,
      },
    });
  }

  for (const a of sampleApplicants()) {
    await prisma.applicant.create({ data: { ...a, appliedAt: new Date(a.appliedAt) } });
  }

  for (const l of sampleListings()) {
    await prisma.jobListing.create({ data: { ...l, postedAt: new Date(l.postedAt) } });
  }
}
