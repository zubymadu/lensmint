import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createClaim, getCreatorClaims, getClaim } from "./claim.service";

export async function claimRoutes(app: FastifyInstance) {
  // POST /campaigns/:campaignId/claims — creator claims a campaign
  app.post("/campaigns/:campaignId/claims", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { campaignId } = z.object({ campaignId: z.string() }).parse(req.params);
    const result = await createClaim(req.user.sub, campaignId);
    return reply.code(201).send(result);
  });

  // GET /my/claims — creator's own claims
  app.get("/my/claims", { onRequest: [app.authenticate] }, async (req) => {
    return getCreatorClaims(req.user.sub);
  });

  // GET /claims/:claimId
  app.get("/claims/:claimId", { onRequest: [app.authenticate] }, async (req) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    return getClaim(claimId, req.user.sub);
  });
}
