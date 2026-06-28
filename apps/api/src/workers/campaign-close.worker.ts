import { Worker } from "bullmq";
import { prisma } from "@lensmint/db";
import { connection } from "./queues";

// Closes campaigns whose end date has passed or budget is exhausted
export const campaignCloseWorker = new Worker(
  "campaign-close",
  async () => {
    const now = new Date();

    // Time-expired campaigns
    const expiredCampaigns = await prisma.campaign.findMany({
      where: {
        status: "active",
        endDate: { lte: now },
      },
      select: { id: true },
    });

    for (const campaign of expiredCampaigns) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "completed" },
      });
      console.log(`[campaign-close] Campaign ${campaign.id} closed (time expired)`);
    }

    // Budget-exhausted campaigns (net budget used >= 100%)
    const fundedCampaigns = await prisma.campaignFunding.findMany({
      where: { campaign: { status: "active" } },
      include: {
        campaign: {
          include: {
            claims: {
              where: { payout: { isNot: null } },
              include: { payout: { select: { amount: true } } },
            },
          },
        },
      },
    });

    for (const funding of fundedCampaigns) {
      const totalPaid = funding.campaign.claims.reduce(
        (sum, c) => sum + Number(c.payout?.amount ?? 0),
        0,
      );
      const netBudget = Number(funding.netBudgetAvailable);

      if (totalPaid >= netBudget * 0.99) {
        await prisma.campaign.update({
          where: { id: funding.campaignId },
          data: { status: "completed" },
        });
        console.log(`[campaign-close] Campaign ${funding.campaignId} closed (budget exhausted)`);
      }
    }
  },
  { connection, concurrency: 1 },
);
