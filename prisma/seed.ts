import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seedDb";

const prisma = new PrismaClient();

async function main() {
  await seedDatabase(prisma);
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
