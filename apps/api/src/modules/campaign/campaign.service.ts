import {
  prisma,
  ComplianceTier,
  CampaignStatus,
  TrustTier,
  Prisma,
} from "@lensmint/db";
import { CreateCampaignInput } from "@lensmint/shared";
import { AppError, ForbiddenError } from "../../lib/errors";

// ── Compliance gate — enforced at campaign creation ───────────────────────────

async function assertBrandCanCreateCampaign(
  userId: string,
  tier: ComplianceTier,
): Promise<void> {
  const brand = await prisma.brandProfile.findUnique({ where: { userId } });
  if (!brand) throw new ForbiddenError("Brand profile required");

  switch (tier) {
    case "commercial":
      // Business name must be set (basic verification)
      if (!brand.businessName) {
        throw new AppError("VERIFICATION_REQUIRED", "Complete business verification before creating commercial campaigns", 403);
      }
      break;

    case "personal": {
      // Personal sponsor must be identity-verified (same bar as Tier 1 creator)
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.kycStatus !== "verified") {
        throw new AppError("VERIFICATION_REQUIRED", "Identity verification required before launching a personal campaign", 403);
      }
      // Must have a verified bank account — personal campaigns funded from own account only
      const bank = await prisma.creatorBankAccount.findUnique({ where: { creatorId: userId } });
      if (!bank?.nameMatchVerified) {
        throw new AppError("BANK_REQUIRED", "Verified bank account required for personal campaigns", 403);
      }
      break;
    }

    case "government":
      if (brand.verificationStatus !== "verified") {
        throw new AppError("VERIFICATION_REQUIRED", "Government account must be admin-verified before creating campaigns", 403);
      }
      break;

    case "political":
      // Political tier only granted by admin — complianceTier field on the profile reflects this
      if (brand.complianceTier !== "political") {
        throw new AppError("TIER_REQUIRED", "Political campaigns require admin-verified political account status", 403);
      }
      if (!brand.politicalRegistrationRef) {
        throw new AppError("REGISTRATION_REQUIRED", "INEC registration reference required for political campaigns", 403);
      }
      break;
  }
}

// ── Campaign CRUD ─────────────────────────────────────────────────────────────

export async function createCampaign(
  userId: string,
  input: CreateCampaignInput & { complianceTier: ComplianceTier },
): Promise<{ id: string }> {
  const brand = await prisma.brandProfile.findUniqueOrThrow({ where: { userId } });

  await assertBrandCanCreateCampaign(userId, input.complianceTier);

  // Personal campaigns: detect if content is substantively political regardless
  // of declared tier — if so, block and require political review path.
  // (Content-level detection runs at qualification time; this is a declaration check.)
  if (input.complianceTier === "personal" && input.contentTypes.some(
    (t) => t.includes("electoral") || t.includes("candidate") || t.includes("political"),
  )) {
    throw new AppError(
      "POLITICAL_REDIRECT",
      "Campaign content appears political — submit under Political/Electoral category with admin verification",
      400,
    );
  }

  const requiresDisclosure =
    input.complianceTier === "commercial" ||
    input.complianceTier === "government" ||
    input.complianceTier === "political";

  const campaign = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      complianceTier: input.complianceTier,
      title: input.title,
      brief: input.brief,
      platforms: input.platforms,
      campaignType: input.campaignType,
      seedingSubtype: input.seedingSubtype ?? null,
      streamingSubtype: input.streamingSubtype ?? null,
      eligibilityCriteria: input.eligibilityCriteria ?? Prisma.JsonNull,
      contentTypes: input.contentTypes,
      qualificationType: input.qualificationType,
      requiresDisclosureLabel: requiresDisclosure,
      brandAssets: input.brandAssets as Prisma.InputJsonValue[],
      payoutLadder: input.payoutLadder as Prisma.InputJsonValue,
      budgetCap: input.budgetCap,
      targetPeriodDays: input.targetPeriodDays ?? null,
      maxCreators: input.maxCreators ?? null,
      currency: input.currency,
      status: "draft",
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });

  return { id: campaign.id };
}

export async function publishCampaign(userId: string, campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { brand: true },
  });

  if (campaign.brand.userId !== userId) throw new ForbiddenError("Not your campaign");
  if (campaign.status !== "draft") throw new AppError("INVALID_STATE", "Only draft campaigns can be published", 400);

  // Political campaigns can never self-publish — require admin sign-off (funding acts as the gate)
  if (campaign.complianceTier === "political") {
    throw new AppError("REQUIRES_ADMIN", "Political campaigns require admin approval before going live", 403);
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "active", startDate: new Date() },
  });
}

export async function getCampaign(campaignId: string) {
  return prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      brand: { select: { businessName: true, complianceTier: true } },
      _count: { select: { claims: true } },
    },
  });
}

export async function listActiveCampaigns(filters: {
  platform?: string;
  campaignType?: string;
  niche?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.CampaignWhereInput = {
    status: "active",
    ...(filters.platform && { platforms: { has: filters.platform } }),
    ...(filters.campaignType && { campaignType: filters.campaignType as any }),
  };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
      orderBy: { createdAt: "desc" },
      include: {
        brand: { select: { businessName: true } },
        _count: { select: { claims: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ]);

  return { campaigns, total };
}

// Budget headroom check — used before accepting new claims
export async function hasBudgetHeadroom(campaignId: string): Promise<boolean> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { funding: true },
  });

  if (!campaign.funding) return false; // unfunded campaigns cannot accept claims

  const netBudget = Number(campaign.funding.netBudgetAvailable);
  const spent = Number(campaign.budgetSpent);
  // Require at least 5% headroom to accept new claims (avoids over-commitment)
  return spent < netBudget * 0.95;
}
