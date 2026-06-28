import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  scheduleSegment,
  submitVodUrl,
  recordStreamMetrics,
  getStreamingClaim,
} from "./streaming.service";

export async function streamingRoutes(app: FastifyInstance) {
  // POST /claims/:claimId/stream/schedule — creator schedules their segment
  app.post("/claims/:claimId/stream/schedule", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    const body = z
      .object({ scheduledSegmentTime: z.string().datetime() })
      .parse(req.body);

    const result = await scheduleSegment(req.user.sub, claimId, body);
    return reply.code(200).send(result);
  });

  // POST /claims/:claimId/stream/vod — creator submits VOD link post-stream
  app.post("/claims/:claimId/stream/vod", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    const body = z
      .object({
        vodUrl: z.string().url(),
        platform: z.string().min(1),
      })
      .parse(req.body);

    const result = await submitVodUrl(req.user.sub, claimId, body);
    return reply.code(201).send(result);
  });

  // GET /claims/:claimId/stream — creator views streaming claim details
  app.get("/claims/:claimId/stream", { onRequest: [app.authenticate] }, async (req) => {
    const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
    return getStreamingClaim(claimId, req.user.sub);
  });

  // POST /admin/claims/:claimId/stream/metrics — platform worker records live metrics
  app.post(
    "/admin/claims/:claimId/stream/metrics",
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const { claimId } = z.object({ claimId: z.string() }).parse(req.params);
      const body = z
        .object({
          metrics: z.array(
            z.object({
              metricType: z.enum([
                "concurrent_viewers",
                "peak_viewers",
                "watch_time_minutes",
                "new_followers",
                "chat_engagement",
              ]),
              value: z.number().nonnegative(),
              platform: z.string(),
              capturedAt: z.string().datetime(),
            }),
          ),
        })
        .parse(req.body);

      const result = await recordStreamMetrics(claimId, body.metrics);
      return reply.code(201).send(result);
    },
  );
}
