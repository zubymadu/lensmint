import { payoutReleaseQueue, campaignCloseQueue } from "./queues";

// Schedule recurring sweep jobs using BullMQ repeatable jobs
export async function startScheduledJobs() {
  // Payout release sweep — every 15 minutes
  await payoutReleaseQueue.add(
    "sweep",
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: "payout-release-sweep" },
  );

  // Campaign close sweep — every hour
  await campaignCloseQueue.add(
    "sweep",
    {},
    { repeat: { every: 60 * 60 * 1000 }, jobId: "campaign-close-sweep" },
  );

  console.log("[scheduler] Recurring jobs registered");
}
