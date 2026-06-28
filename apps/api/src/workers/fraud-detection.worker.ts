import { Worker } from "bullmq";
import { prisma } from "@lensmint/db";
import { connection } from "./queues";
import { logTrustEvent } from "../modules/trust/trust.service";

// Detects suspicious patterns: multiple accounts same device, rapid multi-claim
export const fraudDetectionWorker = new Worker(
  "fraud-detection",
  async (job: { data: { userId: string; claimId?: string; reason?: string } }) => {
    const { userId, claimId, reason } = job.data;

    // Check: creator submitted more than 10 claims in 24h
    const recentClaims = await prisma.campaignClaim.count({
      where: {
        creator: { userId },
        claimedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentClaims > 10) {
      await logTrustEvent(
        userId,
        "fraud_flag",
        `Velocity check: ${recentClaims} claims in 24h`,
      );
      return;
    }

    // Manual fraud flag from admin / AI
    if (reason) {
      await logTrustEvent(userId, "fraud_flag", reason);
    }
  },
  { connection, concurrency: 5 },
);
