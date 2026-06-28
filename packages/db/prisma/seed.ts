import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@lensmint.com" },
    update: {},
    create: {
      email: "admin@lensmint.com",
      role: "admin",
      passwordHash: adminHash,
      trustTier: "tier3",
      kycStatus: "verified",
    },
  });

  // Demo brand
  const brandHash = await bcrypt.hash("brand123", 10);
  const brand = await prisma.user.upsert({
    where: { email: "brand@demo.com" },
    update: {},
    create: {
      email: "brand@demo.com",
      role: "brand",
      passwordHash: brandHash,
      trustTier: "tier1",
      kycStatus: "verified",
      brandProfile: {
        create: {
          businessName: "Demo Brand Co",
          businessType: "FMCG",
          complianceTier: "commercial",
          verificationStatus: "verified",
        },
      },
    },
    include: { brandProfile: true },
  });

  // Demo creator
  const creatorHash = await bcrypt.hash("creator123", 10);
  await prisma.user.upsert({
    where: { email: "creator@demo.com" },
    update: {},
    create: {
      email: "creator@demo.com",
      role: "creator",
      passwordHash: creatorHash,
      trustTier: "tier1",
      kycStatus: "verified",
      creatorProfile: {
        create: {
          socialHandles: { instagram: "demo_creator", tiktok: "democreator" },
          verifiedFollowerCounts: { instagram: 15000 },
          verifiedAvgViewers: 500,
          nicheTags: ["lifestyle", "fashion"],
          languages: ["en", "yo"],
        },
      },
    },
  });

  console.log("✓ Seed complete — admin, brand, creator users created");
  console.log("  admin@lensmint.com / admin123");
  console.log("  brand@demo.com / brand123");
  console.log("  creator@demo.com / creator123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
