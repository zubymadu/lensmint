import { prisma, Prisma } from "@lensmint/db";
import { AppError, NotFoundError } from "../../lib/errors";
import { getPspClient } from "../../lib/psp";
import { HOLD_DAYS_BY_TIER, PAYOUT_CAP_BY_TIER } from "../trust/trust.service";
import { evaluatePayoutLadder } from "../claim/claim.service";

const COMMISSION_RATE = new Prisma.Decimal("0.12"); // 12% default

// ── Campaign funding (brand deposits budget into escrow) ──────────────────────

export async function fundCampaign(
  userId: string,
  campaignId: string,
  input: { amount: number; currency: "NGN"; pspProvider: "paystack" | "moniepoint" | "opay"; pspReference?: string },
) {
  const brand = await prisma.brandProfile.findUniqueOrThrow({ where: { userId } });
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

  if (campaign.brandId !== brand.id) {
    throw new AppError("FORBIDDEN", "You do not own this campaign", 403);
  }
  if (campaign.status !== "draft") {
    throw new AppError("ALREADY_FUNDED", "Campaign has already been funded", 400);
  }

  const depositedAmount = new Prisma.Decimal(input.amount);
  const commissionAmount = depositedAmount.mul(COMMISSION_RATE).toDecimalPlaces(2);
  const netBudget = depositedAmount.sub(commissionAmount).toDecimalPlaces(2);

  const funding = await prisma.$transaction(async (tx) => {
    const cf = await tx.campaignFunding.create({
      data: {
        campaignId,
        depositedAmount,
        platformCommissionRate: COMMISSION_RATE,
        platformCommissionAmount: commissionAmount,
        netBudgetAvailable: netBudget,
        currency: input.currency,
        pspProvider: input.pspProvider,
        pspReference: input.pspReference ?? null,
      },
    });

    // Ledger: deposit
    await tx.ledgerEntry.create({
      data: {
        entryType: "deposit",
        amount: depositedAmount,
        currency: input.currency,
        campaignId,
        fundingId: cf.id,
        pspProvider: input.pspProvider,
        pspReference: input.pspReference ?? null,
      },
    });

    // Ledger: commission revenue
    await tx.ledgerEntry.create({
      data: {
        entryType: "commission_revenue",
        amount: commissionAmount,
        currency: input.currency,
        campaignId,
        fundingId: cf.id,
        pspProvider: input.pspProvider,
      },
    });

    // Activate campaign
    await tx.campaign.update({
      where: { id: campaignId },
      data: { status: "active" },
    });

    return cf;
  });

  return {
    fundingId: funding.id,
    depositedAmount: depositedAmount.toNumber(),
    commissionAmount: commissionAmount.toNumber(),
    netBudgetAvailable: netBudget.toNumber(),
  };
}

// ── Payout creation (called after claim is "qualified") ───────────────────────

export async function createPayout(claimId: string) {
  const claim = await prisma.campaignClaim.findUniqueOrThrow({
    where: { id: claimId },
    include: {
      campaign: { include: { funding: true } },
      creator: { include: { user: { include: { bankAccount: true } } } },
    },
  });

  if (claim.status !== "qualified") {
    throw new AppError("CLAIM_NOT_QUALIFIED", "Claim must be qualified before payout", 400);
  }

  const existingPayout = await prisma.payout.findUnique({ where: { claimId } });
  if (existingPayout) {
    throw new AppError("PAYOUT_EXISTS", "Payout already exists for this claim", 409);
  }

  const funding = claim.campaign.funding;
  if (!funding) throw new AppError("CAMPAIGN_NOT_FUNDED", "Campaign has no funding record", 400);

  const creator = claim.creator;
  const user = creator.user;
  const trustTier = user.trustTier;

  // Evaluate payout amount from ladder + actual metrics
  const metrics = await prisma.metric.findMany({ where: { claimId } });
  const metricsAgg = {
    views: metrics.filter((m) => m.metricType === "views").reduce((s, m) => s + Number(m.value), 0),
    clicks: metrics.filter((m) => m.metricType === "clicks").reduce((s, m) => s + Number(m.value), 0),
  };

  const ladderAmount = evaluatePayoutLadder(
    claim.campaign.payoutLadder as Parameters<typeof evaluatePayoutLadder>[0],
    metricsAgg,
  );

  // Apply tier cap
  const cap = PAYOUT_CAP_BY_TIER[trustTier];
  if (cap === 0) throw new AppError("TIER_BLOCKED", "Your trust tier does not allow payouts", 403);

  const cappedAmount = Math.min(ladderAmount, cap);
  const amount = new Prisma.Decimal(cappedAmount);

  // Hold release date
  const holdDays = HOLD_DAYS_BY_TIER[trustTier];
  const holdReleaseDate = holdDays >= 0
    ? new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000)
    : null;

  const pspProvider = funding.pspProvider;

  const payout = await prisma.$transaction(async (tx) => {
    const p = await tx.payout.create({
      data: {
        claimId,
        amount,
        currency: funding.currency,
        payoutMethod: "ngn_bank_transfer",
        pspProvider,
        holdReleaseDate,
        status: holdDays > 0 ? "held" : "released",
      },
    });

    await tx.ledgerEntry.create({
      data: {
        entryType: "payout",
        amount,
        currency: funding.currency,
        campaignId: claim.campaignId,
        claimId,
        payoutId: p.id,
        pspProvider,
      },
    });

    await tx.campaignClaim.update({ where: { id: claimId }, data: { status: "paid" } });

    return p;
  });

  return {
    payoutId: payout.id,
    amount: amount.toNumber(),
    currency: payout.currency,
    status: payout.status,
    holdReleaseDate: payout.holdReleaseDate,
  };
}

// ── Release held payout (called by BullMQ worker or admin) ───────────────────

export async function releasePayout(payoutId: string) {
  const payout = await prisma.payout.findUniqueOrThrow({
    where: { id: payoutId },
    include: {
      claim: {
        include: { creator: { include: { user: { include: { bankAccount: true } } } } },
      },
    },
  });

  if (payout.status !== "held") {
    throw new AppError("PAYOUT_NOT_HELD", "Payout is not in held status", 400);
  }
  if (payout.holdReleaseDate && payout.holdReleaseDate > new Date()) {
    throw new AppError("HOLD_NOT_EXPIRED", "Hold period has not expired yet", 400);
  }

  const bankAccount = payout.claim.creator.user.bankAccount;
  if (!bankAccount) throw new AppError("NO_BANK_ACCOUNT", "Creator has no bank account on file", 400);
  if (!bankAccount.nameMatchVerified) {
    await prisma.payout.update({ where: { id: payoutId }, data: { status: "on_hold_name_mismatch" } });
    throw new AppError("NAME_MISMATCH", "Bank account name verification pending", 400);
  }

  const pspClient = getPspClient(payout.pspProvider);
  const transferResult = await pspClient.initiateTransfer({
    accountNumber: bankAccount.accountNumber,
    bankCode: bankAccount.bankCode,
    amount: Number(payout.amount),
    currency: payout.currency,
    narration: `Lensmint payout ${payoutId}`,
    idempotencyKey: payoutId,
  });
  const transferRef = transferResult.pspReference;

  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "released" },
  });

  await prisma.ledgerEntry.create({
    data: {
      entryType: "psp_fee_cost",
      amount: new Prisma.Decimal(0), // PSP fee tracked by reconciliation worker
      currency: payout.currency,
      payoutId,
      pspProvider: payout.pspProvider,
      pspReference: transferRef,
    },
  });

  return { payoutId, pspReference: transferRef, status: "released" };
}

// ── Getters ───────────────────────────────────────────────────────────────────

export async function getCampaignFunding(campaignId: string) {
  return prisma.campaignFunding.findUnique({ where: { campaignId } });
}

export async function getPayoutForClaim(claimId: string) {
  return prisma.payout.findUnique({ where: { claimId } });
}

export async function getLedgerEntries(campaignId: string) {
  return prisma.ledgerEntry.findMany({
    where: { campaignId },
    orderBy: { timestamp: "desc" },
  });
}
