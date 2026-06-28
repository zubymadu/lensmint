import { Queue } from "bullmq";

// Pass connection options as plain object so BullMQ uses its own bundled ioredis
const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
export const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
};

export const payoutReleaseQueue = new Queue("payout-release", { connection });
export const campaignCloseQueue = new Queue("campaign-close", { connection });
export const fraudDetectionQueue = new Queue("fraud-detection", { connection });
export const aiQualificationQueue = new Queue("ai-qualification", { connection });
