import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  submitClaimLink,
  recordQualificationResult,
  getClaimSubmissions,
  getQualificationResult,
} from "./submission.service";

export async function submissionRoutes(app: FastifyInstance) {
  // POST /claims/:claimId/submissions — creator submits their post link
  app.post("/claims/:claimId/submissions", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    const body = z
      .object({
        postUrl: z.string().url(),
        platform: z.string().min(1),
        postedAt: z.string().datetime(),
      })
      .parse(req.body);

    const result = await submitClaimLink(req.user.sub, claimId, body);
    return reply.code(201).send(result);
  });

  // GET /claims/:claimId/submissions — creator views their submissions
  app.get("/claims/:claimId/submissions", { onRequest: [app.authenticate] }, async (req) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    return getClaimSubmissions(req.user.sub, claimId);
  });

  // GET /claims/:claimId/qualification — creator checks qualification status
  app.get("/claims/:claimId/qualification", { onRequest: [app.authenticate] }, async (req) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    return getQualificationResult(claimId, req.user.sub);
  });

  // PATCH /admin/claims/:claimId/qualification — AI worker or admin records result
  app.patch(
    "/admin/claims/:claimId/qualification",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
      const body = z
        .object({
          decision: z.enum(["pass", "fail", "needs_review"]),
          confidence: z.number().min(0).max(1).optional(),
          notes: z.string().optional(),
          reviewedBy: z.string().optional(),
        })
        .parse(req.body);

      const result = await recordQualificationResult(claimId, body);
      return reply.code(200).send(result);
    },
  );
}
