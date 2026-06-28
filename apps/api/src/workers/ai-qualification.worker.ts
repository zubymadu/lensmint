import { Worker } from "bullmq";
import { connection } from "./queues";
import { runAiQualification } from "../modules/qualification/ai.service";

// Picks up pending QualificationResult records and runs AI checks
export const aiQualificationWorker = new Worker(
  "ai-qualification",
  async (job: { data: { claimId: string } }) => {
    await runAiQualification(job.data.claimId);
  },
  { connection, concurrency: 3 },
);
