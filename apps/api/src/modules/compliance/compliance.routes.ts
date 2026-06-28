import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  flagClaimForPoliticalReview,
  decidePoliticalReview,
  listPoliticalReviews,
  flagSensitiveContent,
  decideSensitiveFlag,
  listSensitiveFlags,
} from "./compliance.service";

export async function complianceRoutes(app: FastifyInstance) {
  // ── Political review ──────────────────────────────────────────────────────

  // POST /admin/claims/:claimId/political-review — flag claim for review
  app.post(
    "/admin/claims/:claimId/political-review",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
      const result = await flagClaimForPoliticalReview(claimId);
      return reply.code(201).send(result);
    },
  );

  // PATCH /admin/political-reviews/:reviewId — approve or reject
  app.patch(
    "/admin/political-reviews/:reviewId",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { reviewId } = z.object({ reviewId: z.string() }).parse(req.params);
      const body = z
        .object({
          decision: z.enum(["approved", "rejected"]),
          rationale: z.string().min(10),
        })
        .parse(req.body);

      const result = await decidePoliticalReview(reviewId, {
        ...body,
        reviewerId: req.user.sub,
      });
      return reply.code(200).send(result);
    },
  );

  // GET /admin/political-reviews — list queue
  app.get("/admin/political-reviews", { onRequest: [app.authenticate] }, async (req) => {
    const query = z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).parse(req.query);
    return listPoliticalReviews(query.status);
  });

  // ── Sensitive content flags ───────────────────────────────────────────────

  // POST /admin/claims/:claimId/sensitive-flag — flag claim content
  app.post(
    "/admin/claims/:claimId/sensitive-flag",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
      const body = z
        .object({
          category: z.enum([
            "medical_fundraising",
            "missing_person",
            "third_party_named",
            "political_in_disguise",
          ]),
        })
        .parse(req.body);

      const result = await flagSensitiveContent(claimId, body.category);
      return reply.code(201).send(result);
    },
  );

  // PATCH /admin/sensitive-flags/:flagId — approve or reject
  app.patch(
    "/admin/sensitive-flags/:flagId",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { flagId } = z.object({ flagId: z.string() }).parse(req.params);
      const body = z
        .object({
          decision: z.enum(["approved", "rejected"]),
          rationale: z.string().min(10),
        })
        .parse(req.body);

      const result = await decideSensitiveFlag(flagId, {
        ...body,
        reviewerId: req.user.sub,
      });
      return reply.code(200).send(result);
    },
  );

  // GET /admin/sensitive-flags — list queue
  app.get("/admin/sensitive-flags", { onRequest: [app.authenticate] }, async (req) => {
    const query = z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).parse(req.query);
    return listSensitiveFlags(query.status);
  });
}
