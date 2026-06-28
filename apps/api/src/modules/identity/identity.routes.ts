import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SignUpSchema, SignInSchema, BankAccountSchema } from "@lensmint/shared";
import {
  createUser,
  verifyPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  addAndResolveBankAccount,
} from "./identity.service";

export async function identityRoutes(app: FastifyInstance) {
  // POST /auth/signup
  app.post("/auth/signup", async (req, reply) => {
    const body = SignUpSchema.parse(req.body);
    const { id } = await createUser(body);
    return reply.code(201).send({ userId: id });
  });

  // POST /auth/signin
  app.post("/auth/signin", async (req, reply) => {
    const { email, password } = SignInSchema.parse(req.body);
    const userId = await verifyPassword(email, password);
    const token = app.jwt.sign({ sub: userId }, { expiresIn: "7d" });
    return { token };
  });

  // POST /identity/otp/send
  app.post("/identity/otp/send", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { phone } = z.object({ phone: z.string() }).parse(req.body);
    await sendPhoneOtp(phone);
    return reply.code(202).send({ message: "OTP sent" });
  });

  // POST /identity/otp/verify
  app.post("/identity/otp/verify", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { phone, otp } = z.object({ phone: z.string(), otp: z.string() }).parse(req.body);
    await verifyPhoneOtp(req.user.sub, phone, otp);
    return { message: "Phone verified" };
  });

  // POST /identity/bank-account
  app.post("/identity/bank-account", { onRequest: [app.authenticate] }, async (req, reply) => {
    const { accountNumber, bankCode } = BankAccountSchema.parse(req.body);
    const { nameMatchVerified, resolvedName } = await addAndResolveBankAccount(
      req.user.sub,
      accountNumber,
      bankCode,
    );
    return reply.code(201).send({
      resolvedName,
      nameMatchVerified,
      message: nameMatchVerified
        ? "Bank account verified — Tier 1 unlocked"
        : "Bank account added but name mismatch — pending admin review",
    });
  });
}
