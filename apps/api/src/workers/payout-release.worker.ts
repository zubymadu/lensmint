import { Worker } from "bullmq";
import { prisma } from "@lensmint/db";
import { connection } from "./queues";
import { releasePayout } from "../modules/financial/financial.service";
import { markSeedingNoShow } from "../modules/seeding/seeding.service";

// Runs on a schedule — checks for payouts whose hold has expired
export const payoutReleaseWorker = new Worker(
  "payout-release",
  async () => {
    const now = new Date();

    // Find all held payouts past their release date
    const duePayouts = await prisma.payout.findMany({
      where: {
        status: "held",
        holdReleaseDate: { lte: now },
      },
      select: { id: true },
    });

    for (const payout of duePayouts) {
      try {
        await releasePayout(payout.id);
      } catch (err) {
        console.error(`[payout-release] Failed for ${payout.id}:`, err);
      }
    }

    // Check seeding no-shows: delivered + contentDeadline passed + no submission
    const overdueSeeding = await prisma.seedingClaim.findMany({
      where: {
        deliveredConfirmedAt: { not: null },
        contentDeadline: { lte: now },
        claim: {
          status: { in: ["active", "qualifying"] },
        },
      },
      select: { claimId: true },
    });

    for (const { claimId } of overdueSeeding) {
      try {
        await markSeedingNoShow(claimId);
      } catch (err) {
        // markSeedingNoShow throws if submission exists — expected, not an error
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("SUBMISSION_EXISTS")) {
          console.error(`[payout-release] No-show check failed for ${claimId}:`, err);
        }
      }
    }
  },
  { connection, concurrency: 1 },
);
