import { prisma } from "@lensmint/db";
import { AppError, ForbiddenError } from "../../lib/errors";
import { logTrustEvent } from "../trust/trust.service";

// ── Shipping address ──────────────────────────────────────────────────────────

export async function addShippingAddress(
  userId: string,
  claimId: string,
  input: { addressText: string; pickupPointId?: string },
) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const seedingClaim = await prisma.seedingClaim.findUniqueOrThrow({
    where: { claimId },
    include: { claim: true },
  });

  if (seedingClaim.claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");
  if (seedingClaim.claim.status !== "active") {
    throw new AppError("CLAIM_NOT_ACTIVE", "Can only set address on active seeding claims", 400);
  }

  const address = await prisma.$transaction(async (tx) => {
    const addr = await tx.shippingAddress.create({
      data: {
        creatorId: profile.userId,
        addressText: input.addressText,
        pickupPointId: input.pickupPointId ?? null,
        verifiedViaCourierApi: false,
      },
    });

    await tx.seedingClaim.update({
      where: { claimId },
      data: { shippingAddressId: addr.id },
    });

    // Reserve inventory unit
    await tx.productInventory.updateMany({
      where: {
        campaignId: seedingClaim.claim.campaignId,
        unitsAvailable: { gt: 0 },
      },
      data: { unitsClaimed: { increment: 1 } },
    });

    return addr;
  });

  return { addressId: address.id };
}

// ── Courier webhook state machine ─────────────────────────────────────────────

type CourierEvent = "dispatched" | "in_transit" | "delivered" | "failed" | "returned";

export async function handleCourierWebhook(
  claimId: string,
  event: CourierEvent,
  trackingRef: string,
  courierProvider: string,
  timestamp: string,
) {
  const seedingClaim = await prisma.seedingClaim.findUniqueOrThrow({ where: { claimId } });

  const updates: Parameters<typeof prisma.seedingClaim.update>[0]["data"] = {
    courierProvider,
    trackingRef,
  };

  if (event === "delivered") {
    updates.deliveredConfirmedAt = new Date(timestamp);
    // Content deadline: 7 days after delivery
    updates.contentDeadline = new Date(Date.parse(timestamp) + 7 * 24 * 60 * 60 * 1000);
  }

  await prisma.seedingClaim.update({ where: { claimId }, data: updates });

  // Log audit event
  const claimForAudit = await prisma.campaignClaim.findUniqueOrThrow({
    where: { id: claimId },
    include: { creator: { select: { userId: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: claimForAudit.creator.userId,
      action: `courier_${event}`,
      entityType: "SeedingClaim",
      entityId: claimId,
      details: { trackingRef, courierProvider, timestamp },
    },
  });

  return { claimId, event, trackingRef };
}

// ── No-show enforcement (called by payout hold-release worker) ────────────────

export async function markSeedingNoShow(claimId: string) {
  const seedingClaim = await prisma.seedingClaim.findUniqueOrThrow({
    where: { claimId },
    include: { claim: { include: { creator: { select: { userId: true } } } } },
  });

  if (!seedingClaim.deliveredConfirmedAt) {
    throw new AppError("NOT_DELIVERED", "Product not yet confirmed as delivered", 400);
  }

  if (!seedingClaim.contentDeadline || new Date() < seedingClaim.contentDeadline) {
    throw new AppError("DEADLINE_NOT_PASSED", "Content deadline has not passed yet", 400);
  }

  const claim = seedingClaim.claim;

  // Check no submission has been accepted
  const acceptedSubmission = await prisma.submissionEvent.findFirst({
    where: { claimId, status: "accepted" },
  });
  if (acceptedSubmission) {
    throw new AppError("SUBMISSION_EXISTS", "Creator has an accepted submission — not a no-show", 400);
  }

  // Advance claim to no_show
  await prisma.campaignClaim.update({ where: { id: claimId }, data: { status: "no_show" } });

  // Log trust event — seeding_no_show = -50 (heavier than fraud_flag)
  await logTrustEvent(claim.creator.userId, "seeding_no_show", `No content submitted for seeding claim ${claimId}`);

  return { claimId, status: "no_show" };
}

// ── Getters ───────────────────────────────────────────────────────────────────

export async function getSeedingClaim(claimId: string, userId: string) {
  const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId } });
  const claim = await prisma.campaignClaim.findUniqueOrThrow({ where: { id: claimId } });
  if (claim.creatorId !== profile.id) throw new ForbiddenError("Not your claim");

  return prisma.seedingClaim.findUnique({
    where: { claimId },
    include: { shippingAddress: true },
  });
}
