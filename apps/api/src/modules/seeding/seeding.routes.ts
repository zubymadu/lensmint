import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  addShippingAddress,
  handleCourierWebhook,
  markSeedingNoShow,
  getSeedingClaim,
} from "./seeding.service";

export async function seedingRoutes(app: FastifyInstance) {
  // POST /claims/:claimId/shipping-address — creator provides shipping address
  app.post("/claims/:claimId/shipping-address", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    const body = z
      .object({
        addressText: z.string().min(10),
        pickupPointId: z.string().optional(),
      })
      .parse(req.body);

    const result = await addShippingAddress(req.user.sub, claimId, body);
    return reply.code(201).send(result);
  });

  // GET /claims/:claimId/seeding — view seeding claim details
  app.get("/claims/:claimId/seeding", { onRequest: [app.authenticate] }, async (req) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    return getSeedingClaim(claimId, req.user.sub);
  });

  // POST /webhooks/courier — courier provider sends delivery events
  app.post("/webhooks/courier", async (req, reply) => {
    const body = z
      .object({
        claimId: z.string(),
        event: z.enum(["dispatched", "in_transit", "delivered", "failed", "returned"]),
        trackingRef: z.string(),
        courierProvider: z.string(),
        timestamp: z.string().datetime(),
      })
      .parse(req.body);

    const result = await handleCourierWebhook(
      body.claimId,
      body.event,
      body.trackingRef,
      body.courierProvider,
      body.timestamp,
    );
    return reply.code(200).send(result);
  });

  // POST /admin/claims/:claimId/no-show — admin/worker marks seeding no-show
  app.post("/admin/claims/:claimId/no-show", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    const result = await markSeedingNoShow(claimId);
    return reply.code(200).send(result);
  });
}
