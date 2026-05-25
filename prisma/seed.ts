import { PrismaClient } from "@prisma/client";
import {
  SAMPLE_USERS,
  sampleApplicants,
  sampleApplications,
  sampleContracts,
  sampleListings,
  sampleSops,
  sampleTimeEntries,
} from "../src/lib/sampleData";

const prisma = new PrismaClient();

async function main() {
  // Clear (order matters for relations).
  await prisma.timeEntry.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.applicant.deleteMany();
  await prisma.jobListing.deleteMany();
  await prisma.sopDoc.deleteMany();
  await prisma.user.deleteMany();

  for (const u of SAMPLE_USERS) {
    await prisma.user.create({ data: u });
  }

  for (const a of sampleApplications()) {
    await prisma.jobApplication.create({
      data: { ...a, date: new Date(a.date) },
    });
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
    await prisma.sopDoc.create({
      data: { ...s, uploadedAt: new Date(s.uploadedAt) },
    });
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
    await prisma.applicant.create({
      data: { ...a, appliedAt: new Date(a.appliedAt) },
    });
  }

  for (const l of sampleListings()) {
    await prisma.jobListing.create({
      data: { ...l, postedAt: new Date(l.postedAt) },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    applications: await prisma.jobApplication.count(),
    timeEntries: await prisma.timeEntry.count(),
    sops: await prisma.sopDoc.count(),
    contracts: await prisma.contract.count(),
    applicants: await prisma.applicant.count(),
    listings: await prisma.jobListing.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
