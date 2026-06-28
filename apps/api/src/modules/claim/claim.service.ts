import { prisma, CampaignClaim, TrustTier, ClaimStatus, Prisma } from "@lensmint/db";
import { AppError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { assertTier1 } from "../trust/trust.service";
import { hasBudgetHeadroom } from "../campaign/campaign.service";
import { nanoid } from "nanoid";

// ── Claim creation — open, non-exclusive ─────────────────────────────────────

export async function createClaim(
  userId: string,
  campaignId: string,
): Promise<{ claimId: string; trackedLink: string; trackedHashtag: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { creatorProfile: true },
  });

  // Hard gate: Tier 0 cannot claim anything
  assertTier1(user.trustTier);

  if (!user.creatorProfile) {
    throw new ForbiddenError("Creator profile required to claim campaigns");
  }

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { _count: { select: { claims: true } } },
  });

  if (campaign.status !== "active") {
    throw new AppError("CAMPAIGN_INACTIVE", "Campaign is not accepting claims", 400);
  }

  // Creator cap check
  if (campaign.maxCreators !== null && campaign._count.claims >= campaign.maxCreators) {
    throw new AppError("CREATOR_CAP_REACHED", "Campaign creator cap has been reached", 409);
  }

  // Budget headroom check
  if (!(await hasBudgetHeadroom(campaignId))) {
    throw new AppError("BUDGET_EXHAUSTED", "Campaign budget is fully committed", 409);
  }

  // Seeding campaigns: Tier 1 minimum is already enforced above, inventory checked separately
  if (campaign.campaignType === "seeding") {
    const inventory = await prisma.productInventory.findFirst({
      where: { campaignId, unitsAvailable: { gt: prisma.productInventory.fields.unitsClaimed as any } },
    });
    if (!inventory) {
      throw new AppError("OUT_OF_STOCK", "No inventory remaining for this seeding campaign", 409);
    }
  }

  // Streaming campaigns: check eligibility criteria at claim time
  if (campaign.campaignType === "streaming" && campaign.eligibilityCriteria) {
    await assertStreamingEligibility(user.creatorProfile.id, campaign.eligibilityCriteria as any);
  }

  // Duplicate claim check — one claim per creator per campaign
  const existing = await prisma.campaignClaim.findUnique({
    where: { campaignId_creatorId: { campaignId, creatorId: user.creatorProfile.id } },
  });
  if (existing) {
    throw new AppError("ALREADY_CLAIMED", "You have already claimed this campaign", 409);
  }

  // Generate unique tracked identifiers for attribution
  const claimToken = nanoid(10);
  const trackedLink = `https://go.lensmint.com/${claimToken}`;
  const trackedHashtag = `#LM${claimToken}`;

  const claim = await prisma.campaignClaim.create({
    data: {
      campaignId,
      creatorId: user.creatorProfile.id,
      trackedLink,
      trackedHashtag,
      status: "active",
    },
  });

  // For seeding: create the SeedingClaim shell (address collected separately)
  if (campaign.campaignType === "seeding") {
    await prisma.seedingClaim.create({
      data: {
        claimId: claim.id,
        shippingAddressId: "", // placeholder — creator provides address next
        courierProvider: null,
        trackingRef: null,
      },
    });
  }

  // For streaming: create the StreamingClaim shell
  if (campaign.campaignType === "streaming") {
    const eligibilityResult = campaign.eligibilityCriteria
      ? await buildEligibilityResult(user.creatorProfile.id, campaign.eligibilityCriteria as any)
      : null;

    await prisma.streamingClaim.create({
      data: {
        claimId: claim.id,
        verificationMethod: "vod_review",
        eligibilityCheckResult: (eligibilityResult ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  return { claimId: claim.id, trackedLink, trackedHashtag };
}

// ── Streaming eligibility ─────────────────────────────────────────────────────

async function assertStreamingEligibility(
  creatorProfileId: string,
  criteria: {
    minAvgViewers?: number;
    minStreamHours30d?: number;
    platformVerifiedRequired?: boolean;
    niche?: string[];
  },
): Promise<void> {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({
    where: { id: creatorProfileId },
  });

  if (criteria.minAvgViewers && (profile.verifiedAvgViewers ?? 0) < criteria.minAvgViewers) {
    throw new AppError(
      "ELIGIBILITY_FAILED",
      `Minimum ${criteria.minAvgViewers} average viewers required for this campaign`,
      403,
    );
  }

  if (criteria.minStreamHours30d && (profile.verifiedStreamHours30d ?? 0) < criteria.minStreamHours30d) {
    throw new AppError(
      "ELIGIBILITY_FAILED",
      `Minimum ${criteria.minStreamHours30d} stream hours in the past 30 days required`,
      403,
    );
  }

  if (criteria.niche?.length) {
    const hasNiche = criteria.niche.some((n) => profile.nicheTags.includes(n));
    if (!hasNiche) {
      throw new AppError("ELIGIBILITY_FAILED", "Your niche does not match this campaign's requirements", 403);
    }
  }
}

async function buildEligibilityResult(
  creatorProfileId: string,
  criteria: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({
    where: { id: creatorProfileId },
  });
  return {
    checkedAt: new Date().toISOString(),
    avgViewers: profile.verifiedAvgViewers,
    streamHours30d: profile.verifiedStreamHours30d,
    nicheTags: profile.nicheTags,
    criteria,
    passed: true,
  };
}

// ── Claim queries ─────────────────────────────────────────────────────────────

export async function getCreatorClaims(userId: string) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  return prisma.campaignClaim.findMany({
    where: { creatorId: profile.id },
    include: {
      campaign: { select: { title: true, complianceTier: true, campaignType: true, payoutLadder: true } },
      payout: true,
    },
    orderBy: { claimedAt: "desc" },
  });
}

export async function getClaim(claimId: string, userId: string): Promise<CampaignClaim> {
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } });
  const claim = await prisma.campaignClaim.findUniqueOrThrow({ where: { id: claimId } });

  if (profile && claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");
  return claim;
}

// ── Payout ladder evaluation (used later by payout service) ──────────────────

export function evaluatePayoutLadder(
  ladder: {
    minimumThreshold: number;
    tiers: Array<{ minViews: number; maxViews?: number; baseRatePer1k: number; multiplier: number }>;
    conversionBonusPerClick?: number;
    conversionBonusPerSale?: number;
  },
  metrics: { views: number; clicks?: number; sales?: number },
): number {
  if (metrics.views < ladder.minimumThreshold) return 0;

  // Find the highest matching tier
  const matchedTier = [...ladder.tiers]
    .reverse()
    .find((t) => metrics.views >= t.minViews && (t.maxViews === undefined || metrics.views < t.maxViews));

  if (!matchedTier) return 0;

  let amount = (metrics.views / 1000) * matchedTier.baseRatePer1k * matchedTier.multiplier;

  if (ladder.conversionBonusPerClick && metrics.clicks) {
    amount += metrics.clicks * ladder.conversionBonusPerClick;
  }
  if (ladder.conversionBonusPerSale && metrics.sales) {
    amount += metrics.sales * ladder.conversionBonusPerSale;
  }

  return Math.round(amount * 100) / 100; // round to 2dp
}
