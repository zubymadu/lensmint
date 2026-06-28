import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreateCampaignSchema } from "@lensmint/shared";
import {
  createCampaign,
  publishCampaign,
  getCampaign,
  listActiveCampaigns,
} from "./campaign.service";

export async function campaignRoutes(app: FastifyInstance) {
  // POST /campaigns — brand creates a campaign
  app.post("/campaigns", { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = CreateCampaignSchema.extend({
      complianceTier: z.enum(["commercial", "personal", "government", "political"]),
    }).parse(req.body);

    const { id } = await createCampaign(req.user.sub, body);
    return reply.code(201).send({ campaignId: id });
  });

  // POST /campaigns/:id/publish
  app.post("/campaigns/:id/publish", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await publishCampaign(req.user.sub, id);
    return reply.code(200).send({ message: "Campaign published" });
  });

  // GET /campaigns — browse active campaigns (public)
  app.get("/campaigns", async (req, reply) => {
    const query = z.object({
      platform: z.string().optional(),
      campaignType: z.string().optional(),
      niche: z.string().optional(),
      limit: z.coerce.number().int().positive().max(100).default(20),
      offset: z.coerce.number().int().nonnegative().default(0),
    }).parse(req.query);

    const result = await listActiveCampaigns(query);
    return result;
  });

  // GET /campaigns/:id
  app.get("/campaigns/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return getCampaign(id);
  });
}
