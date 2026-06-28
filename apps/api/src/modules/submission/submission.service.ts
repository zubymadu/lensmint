import { prisma } from "@lensmint/db";
import { AppError, ForbiddenError } from "../../lib/errors";

// ── Link submission ───────────────────────────────────────────────────────────

export async function submitClaimLink(
  userId: string,
  claimId: string,
  input: { postUrl: string; platform: string; postedAt: string },
) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const claim = await prisma.campaignClaim.findUniqueOrThrow({
    where: { id: claimId },
    include: { campaign: true },
  });

  if (claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");
  if (claim.status !== "active") {
    throw new AppError("CLAIM_NOT_ACTIVE", "Only active claims can have links submitted", 400);
  }

  // Attribution check: post URL must contain tracked link or hashtag
  const trackedIdentifierPresent =
    input.postUrl.includes(claim.trackedLink ?? "") ||
    input.postUrl.includes(claim.trackedHashtag ?? "");

  // Ownership check: platform handle must appear in the URL
  const handles = (profile.socialHandles as Record<string, string>) ?? {};
  const platformHandle = handles[input.platform];
  const accountOwnershipVerified = platformHandle
    ? input.postUrl.toLowerCase().includes(platformHandle.toLowerCase())
    : false;

  // Timing check: post must be within campaign window (null dates = no bound)
  const postedAt = new Date(input.postedAt);
  const withinCampaignWindow =
    (claim.campaign.startDate === null || postedAt >= claim.campaign.startDate) &&
    (claim.campaign.endDate === null || postedAt <= claim.campaign.endDate);

  const submissionStatus: "accepted" | "rejected_mismatch" | "rejected_ownership" | "rejected_timing" =
    !accountOwnershipVerified
      ? "rejected_ownership"
      : !trackedIdentifierPresent
        ? "rejected_mismatch"
        : !withinCampaignWindow
          ? "rejected_timing"
          : "accepted";

  const event = await prisma.submissionEvent.create({
    data: {
      claimId,
      submittedUrl: input.postUrl,
      existenceVerified: true, // assume URL resolves; real check done by worker
      withinCampaignWindow,
      trackedIdentifierPresent,
      accountOwnershipVerified,
      status: submissionStatus,
    },
  });

  if (submissionStatus === "accepted") {
    await prisma.campaignClaim.update({
      where: { id: claimId },
      data: { status: "qualifying" },
    });
    // Create pending QualificationResult for AI worker to pick up
    await prisma.qualificationResult.create({
      data: {
        claimId,
        method: deriveQualificationMethod(claim.campaign.qualificationType),
        decision: "needs_review",
        confidence: null,
        reviewedBy: "ai",
        notes: null,
      },
    });
  }

  return {
    submissionId: event.id,
    status: submissionStatus,
    trackedIdentifierPresent,
    accountOwnershipVerified,
    withinCampaignWindow,
  };
}

function deriveQualificationMethod(qualificationType: string): "asset_match" | "transcript_sentiment" | "text_nlp" {
  switch (qualificationType) {
    case "brand_material":
      return "asset_match";
    case "positive_mention":
      return "transcript_sentiment";
    default:
      return "text_nlp";
  }
}

// ── Record qualification result (called by AI worker or admin) ────────────────

export async function recordQualificationResult(
  claimId: string,
  input: {
    decision: "pass" | "fail" | "needs_review";
    confidence?: number;
    notes?: string;
    reviewedBy?: string;
  },
) {
  const qr = await prisma.qualificationResult.findUniqueOrThrow({ where: { claimId } });

  const updated = await prisma.qualificationResult.update({
    where: { id: qr.id },
    data: {
      decision: input.decision,
      confidence: input.confidence ?? null,
      notes: input.notes ?? null,
      reviewedBy: input.reviewedBy ?? "ai",
    },
  });

  const nextStatus =
    input.decision === "pass"
      ? "qualified"
      : input.decision === "fail"
        ? "disqualified"
        : "under_review";

  await prisma.campaignClaim.update({
    where: { id: claimId },
    data: { status: nextStatus },
  });

  return updated;
}

// ── Getters ───────────────────────────────────────────────────────────────────

export async function getClaimSubmissions(userId: string, claimId: string) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const claim = await prisma.campaignClaim.findUniqueOrThrow({ where: { id: claimId } });
  if (claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");

  return prisma.submissionEvent.findMany({
    where: { claimId },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getQualificationResult(claimId: string, userId: string) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const claim = await prisma.campaignClaim.findUniqueOrThrow({ where: { id: claimId } });
  if (claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");

  return prisma.qualificationResult.findUnique({ where: { claimId } });
}
