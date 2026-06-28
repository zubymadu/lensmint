import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth";
import { identityRoutes } from "./modules/identity/identity.routes";
import { campaignRoutes } from "./modules/campaign/campaign.routes";
import { claimRoutes } from "./modules/claim/claim.routes";
import { submissionRoutes } from "./modules/submission/submission.routes";
import { financialRoutes } from "./modules/financial/financial.routes";
import { AppError } from "./lib/errors";
import { ZodError } from "zod";

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, { origin: true });
  await app.register(authPlugin);

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "Validation error", issues: (error as ZodError).issues });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "INTERNAL_ERROR", message: "Something went wrong" });
  });

  app.get("/health", async () => ({ status: "ok" }));
  await app.register(identityRoutes);
  await app.register(campaignRoutes);
  await app.register(claimRoutes);
  await app.register(submissionRoutes);
  await app.register(financialRoutes);

  await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
