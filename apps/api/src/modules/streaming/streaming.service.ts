import { prisma } from "@lensmint/db";
import { AppError, ForbiddenError } from "../../lib/errors";

// ── Schedule a streaming segment ─────────────────────────────────────────────

export async function scheduleSegment(
  userId: string,
  claimId: string,
  input: { scheduledSegmentTime: string },
) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const streamingClaim = await prisma.streamingClaim.findUniqueOrThrow({
    where: { claimId },
    include: { claim: { include: { campaign: true } } },
  });

  if (streamingClaim.claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");
  if (streamingClaim.claim.status !== "active") {
    throw new AppError("CLAIM_NOT_ACTIVE", "Claim is not active", 400);
  }

  const scheduledAt = new Date(input.scheduledSegmentTime);
  const campaign = streamingClaim.claim.campaign;

  // Validate segment falls within campaign window
  if (campaign.endDate && scheduledAt > campaign.endDate) {
    throw new AppError("OUTSIDE_CAMPAIGN_WINDOW", "Scheduled time is after campaign end", 400);
  }
  if (campaign.startDate && scheduledAt < campaign.startDate) {
    throw new AppError("OUTSIDE_CAMPAIGN_WINDOW", "Scheduled time is before campaign start", 400);
  }

  await prisma.streamingClaim.update({
    where: { claimId },
    data: { scheduledSegmentTime: scheduledAt },
  });

  return { claimId, scheduledSegmentTime: scheduledAt };
}

// ── Submit VOD URL after stream completes ─────────────────────────────────────

export async function submitVodUrl(
  userId: string,
  claimId: string,
  input: { vodUrl: string; platform: string },
) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const streamingClaim = await prisma.streamingClaim.findUniqueOrThrow({
    where: { claimId },
    include: { claim: { include: { campaign: true } } },
  });

  if (streamingClaim.claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");

  await prisma.streamingClaim.update({
    where: { claimId },
    data: { vodUrl: input.vodUrl },
  });

  // Trigger submission pipeline — treated same as link submission
  const campaign = streamingClaim.claim.campaign;
  const trackedIdentifierPresent =
    input.vodUrl.includes(streamingClaim.claim.trackedLink ?? "") ||
    input.vodUrl.includes(streamingClaim.claim.trackedHashtag ?? "");

  const handles = (profile.socialHandles as Record<string, string>) ?? {};
  const platformHandle = handles[input.platform];
  const accountOwnershipVerified = platformHandle
    ? input.vodUrl.toLowerCase().includes(platformHandle.toLowerCase())
    : false;

  const now = new Date();
  const withinCampaignWindow =
    (campaign.startDate === null || now >= campaign.startDate) &&
    (campaign.endDate === null || now <= campaign.endDate);

  const status =
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
      submittedUrl: input.vodUrl,
      existenceVerified: true,
      withinCampaignWindow,
      trackedIdentifierPresent,
      accountOwnershipVerified,
      status,
    },
  });

  if (status === "accepted") {
    await prisma.campaignClaim.update({ where: { id: claimId }, data: { status: "qualifying" } });
    await prisma.qualificationResult.create({
      data: {
        claimId,
        method: "transcript_sentiment",
        decision: "needs_review",
        confidence: null,
        reviewedBy: "ai",
        notes: null,
      },
    });
  }

  return { submissionId: event.id, status, trackedIdentifierPresent, accountOwnershipVerified };
}

// ── Record live-verified metrics (from Twitch/YouTube Live API) ───────────────

export async function recordStreamMetrics(
  claimId: string,
  metrics: Array<{
    metricType: "concurrent_viewers" | "peak_viewers" | "watch_time_minutes" | "new_followers" | "chat_engagement";
    value: number;
    platform: string;
    capturedAt: string;
  }>,
) {
  // Validate streaming claim exists
  await prisma.streamingClaim.findUniqueOrThrow({ where: { claimId } });

  await prisma.metric.createMany({
    data: metrics.map((m) => ({
      claimId,
      platform: m.platform,
      metricType: m.metricType,
      value: m.value,
      verificationMethod: "api",
      capturedAt: new Date(m.capturedAt),
    })),
  });

  return { claimId, recorded: metrics.length };
}

// ── Getters ───────────────────────────────────────────────────────────────────

export async function getStreamingClaim(claimId: string, userId: string) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const claim = await prisma.campaignClaim.findUniqueOrThrow({ where: { id: claimId } });
  if (claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");

  return prisma.streamingClaim.findUnique({ where: { claimId } });
}
