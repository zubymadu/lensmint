import { prisma, TrustTier, TrustEventType, Prisma } from "@lensmint/db";

// Weights for trust score events — seeding no-show is heavier than a missed threshold
const TRUST_EVENT_WEIGHTS: Record<TrustEventType, number> = {
  campaign_completed: +10,
  fraud_flag: -30,
  kyc_verified: +20,
  audit_pass: +5,
  seeding_no_show: -50, // heavier than fraud_flag — real unrecoverable cost to brand
};

// Cumulative score thresholds for tier promotion
const TIER_THRESHOLDS = {
  tier1: 0,   // reached via phone+bank verification, not score
  tier2: 50,
  tier3: 150,
};

export async function logTrustEvent(
  userId: string,
  eventType: TrustEventType,
  notes?: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  const scoreImpact = TRUST_EVENT_WEIGHTS[eventType];

  await db.trustEvent.create({
    data: { userId, eventType, scoreImpact, notes },
  });

  // Recalculate tier after every event
  await recalculateTrustTier(userId, tx);
}

export async function recalculateTrustTier(
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<TrustTier> {
  const db = tx ?? prisma;

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  // Tier 1 is gated by phone+bank verification, not score — don't demote below tier1
  // if they've already passed verification.
  const isVerified = user.kycStatus === "verified";

  const events = await db.trustEvent.findMany({ where: { userId } });
  const totalScore = events.reduce((sum, e) => sum + e.scoreImpact, 0);

  const fraudFlagCount = events.filter((e) => e.eventType === "fraud_flag").length;
  const seedingNoShowCount = events.filter((e) => e.eventType === "seeding_no_show").length;

  // Hard block: 3+ fraud flags locks at tier1 regardless of score
  const hardBlocked = fraudFlagCount >= 3 || seedingNoShowCount >= 2;

  let newTier: TrustTier;
  if (!isVerified) {
    newTier = "tier0";
  } else if (hardBlocked || totalScore < TIER_THRESHOLDS.tier2) {
    newTier = "tier1";
  } else if (totalScore < TIER_THRESHOLDS.tier3) {
    newTier = "tier2";
  } else {
    newTier = "tier3";
  }

  await db.user.update({ where: { id: userId }, data: { trustTier: newTier } });
  return newTier;
}

export function assertTier1(trustTier: TrustTier): void {
  if (trustTier === "tier0") {
    throw new Error("TIER_REQUIRED: Identity verification required to claim campaigns");
  }
}

// Hold-release days by tier — Tier 3 gets same-day (0), Tier 1 waits 7 days
export const HOLD_DAYS_BY_TIER: Record<TrustTier, number> = {
  tier0: -1, // should never pay out a tier0 user
  tier1: 7,
  tier2: 2,
  tier3: 0,
};

// Max single payout cap by tier (NGN)
export const PAYOUT_CAP_BY_TIER: Record<TrustTier, number> = {
  tier0: 0,
  tier1: 50_000,
  tier2: 500_000,
  tier3: 5_000_000,
};
