import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  fundCampaign,
  createPayout,
  releasePayout,
  getCampaignFunding,
  getPayoutForClaim,
  getLedgerEntries,
} from "./financial.service";

export async function financialRoutes(app: FastifyInstance) {
  // POST /campaigns/:campaignId/fund — brand funds campaign into escrow
  app.post("/campaigns/:campaignId/fund", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { campaignId } = z.object({ campaignId: z.string() }).parse(req.params);
    const body = z
      .object({
        amount: z.number().positive(),
        currency: z.literal("NGN"),
        pspProvider: z.enum(["paystack", "moniepoint", "opay"]),
        pspReference: z.string().optional(),
      })
      .parse(req.body);

    const result = await fundCampaign(req.user.sub, campaignId, body);
    return reply.code(201).send(result);
  });

  // GET /campaigns/:campaignId/funding — view funding record
  app.get("/campaigns/:campaignId/funding", { onRequest: [app.authenticate] }, async (req) => {
    const { campaignId } = z.object({ campaignId: z.string() }).parse(req.params);
    return getCampaignFunding(campaignId);
  });

  // GET /campaigns/:campaignId/ledger — view ledger entries
  app.get("/campaigns/:campaignId/ledger", { onRequest: [app.authenticate] }, async (req) => {
    const { campaignId } = z.object({ campaignId: z.string() }).parse(req.params);
    return getLedgerEntries(campaignId);
  });

  // POST /admin/claims/:claimId/payout — create payout after qualification
  app.post("/admin/claims/:claimId/payout", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    const result = await createPayout(claimId);
    return reply.code(201).send(result);
  });

  // GET /claims/:claimId/payout — creator checks payout status
  app.get("/claims/:claimId/payout", { onRequest: [app.authenticate] }, async (req) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    return getPayoutForClaim(claimId);
  });

  // POST /admin/payouts/:payoutId/release — release held payout
  app.post("/admin/payouts/:payoutId/release", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { payoutId } = z.object({ payoutId: z.string() }).parse(req.params);
    const result = await releasePayout(payoutId);
    return reply.code(200).send(result);
  });
}
