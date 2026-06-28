// API entry point — implementation begins in Step 3
import "dotenv/config";
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });

