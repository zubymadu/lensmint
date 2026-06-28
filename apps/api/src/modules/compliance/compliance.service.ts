import { prisma, Prisma } from "@lensmint/db";
import { AppError } from "../../lib/errors";

// ── Political review queue (per claim) ────────────────────────────────────────

export async function flagClaimForPoliticalReview(claimId: string) {
  const claim = await prisma.campaignClaim.findUniqueOrThrow({
    where: { id: claimId },
    include: { campaign: true },
  });

  if (claim.campaign.complianceTier !== "political") {
    throw new AppError("NOT_POLITICAL", "Only claims on political campaigns can be queued", 400);
  }

  const existing = await prisma.politicalReviewQueue.findUnique({ where: { claimId } });
  if (existing) {
    throw new AppError("ALREADY_QUEUED", "Claim is already in political review queue", 409);
  }

  await prisma.campaignClaim.update({ where: { id: claimId }, data: { status: "under_review" } });

  return prisma.politicalReviewQueue.create({
    data: { claimId, status: "pending" },
  });
}

export async function decidePoliticalReview(
  reviewId: string,
  input: {
    decision: "approved" | "rejected";
    rationale: string;
    reviewerId: string;
    checklistResult?: Record<string, boolean>;
  },
) {
  const review = await prisma.politicalReviewQueue.findUniqueOrThrow({ where: { id: reviewId } });

  if (review.status !== "pending") {
    throw new AppError("ALREADY_DECIDED", "Review has already been decided", 400);
  }

  await prisma.politicalReviewQueue.update({
    where: { id: reviewId },
    data: {
      status: input.decision,
      decisionRationale: input.rationale,
      assignedReviewerId: input.reviewerId,
      decidedAt: new Date(),
      checklistResult: (input.checklistResult ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });

  // approved → qualifying; rejected → rejected
  const nextClaimStatus = input.decision === "approved" ? "qualifying" : "rejected";
  await prisma.campaignClaim.update({
    where: { id: review.claimId },
    data: { status: nextClaimStatus },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.reviewerId,
      action: `political_review_${input.decision}`,
      entityType: "PoliticalReviewQueue",
      entityId: reviewId,
      details: { rationale: input.rationale },
    },
  });

  return { reviewId, decision: input.decision, claimStatus: nextClaimStatus };
}

export async function listPoliticalReviews(status?: "pending" | "approved" | "rejected") {
  return prisma.politicalReviewQueue.findMany({
    where: status ? { status } : undefined,
    include: {
      claim: {
        select: { id: true, status: true, campaign: { select: { title: true, complianceTier: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Sensitive content flags ───────────────────────────────────────────────────

export async function flagSensitiveContent(
  claimId: string,
  category:
    | "medical_fundraising"
    | "missing_person"
    | "third_party_named"
    | "political_in_disguise",
) {
  await prisma.campaignClaim.findUniqueOrThrow({ where: { id: claimId } });

  const existing = await prisma.sensitiveContentFlag.findUnique({ where: { claimId } });
  if (existing) {
    throw new AppError("ALREADY_FLAGGED", "Claim already has a sensitive content flag", 409);
  }

  await prisma.campaignClaim.update({ where: { id: claimId }, data: { status: "under_review" } });

  return prisma.sensitiveContentFlag.create({
    data: { claimId, category, status: "pending" },
  });
}

export async function decideSensitiveFlag(
  flagId: string,
  input: {
    decision: "approved" | "rejected";
    rationale: string;
    reviewerId: string;
  },
) {
  const flag = await prisma.sensitiveContentFlag.findUniqueOrThrow({ where: { id: flagId } });

  if (flag.status !== "pending") {
    throw new AppError("ALREADY_DECIDED", "Flag has already been decided", 400);
  }

  await prisma.sensitiveContentFlag.update({
    where: { id: flagId },
    data: {
      status: input.decision,
      decisionRationale: input.rationale,
      assignedReviewerId: input.reviewerId,
      decidedAt: new Date(),
    },
  });

  const nextClaimStatus = input.decision === "approved" ? "qualifying" : "rejected";
  await prisma.campaignClaim.update({
    where: { id: flag.claimId },
    data: { status: nextClaimStatus },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.reviewerId,
      action: `sensitive_flag_${input.decision}`,
      entityType: "SensitiveContentFlag",
      entityId: flagId,
      details: { rationale: input.rationale, category: flag.category },
    },
  });

  return { flagId, decision: input.decision, claimStatus: nextClaimStatus };
}

export async function listSensitiveFlags(status?: "pending" | "approved" | "rejected") {
  return prisma.sensitiveContentFlag.findMany({
    where: status ? { status } : undefined,
    include: {
      claim: {
        select: { id: true, status: true, campaign: { select: { title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
