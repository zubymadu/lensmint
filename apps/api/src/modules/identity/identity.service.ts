import { prisma, KycStatus } from "@lensmint/db";
import { getPspClient } from "../../lib/psp";
import { AppError, ConflictError, NotFoundError } from "../../lib/errors";
import { logTrustEvent } from "../trust/trust.service";
import bcrypt from "bcryptjs";

// ── OTP ─────────────────────────────────────────────────────────────────────

// In-memory OTP store for dev; replace with Redis in production
const otpStore = new Map<string, { otp: string; reference: string; expiresAt: number }>();

export async function sendPhoneOtp(phone: string): Promise<void> {
  const psp = getPspClient("paystack");
  const { reference } = await psp.sendOtp(phone);

  // In dev, generate a deterministic OTP so tests can proceed without a real PSP
  const otp = process.env.NODE_ENV === "production"
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : "123456";

  otpStore.set(phone, { otp, reference, expiresAt: Date.now() + 10 * 60 * 1000 });
}

export async function verifyPhoneOtp(userId: string, phone: string, otp: string): Promise<void> {
  const stored = otpStore.get(phone);
  if (!stored || Date.now() > stored.expiresAt) {
    throw new AppError("OTP_EXPIRED", "OTP expired or not found", 400);
  }
  if (stored.otp !== otp) {
    throw new AppError("OTP_INVALID", "Incorrect OTP", 400);
  }
  otpStore.delete(phone);

  await prisma.user.update({
    where: { id: userId },
    data: { phone, kycStatus: KycStatus.pending },
  });
}

// ── Bank account resolution ──────────────────────────────────────────────────

export async function addAndResolveBankAccount(
  userId: string,
  accountNumber: string,
  bankCode: string,
  pspProvider: "paystack" | "moniepoint" | "opay" = "paystack",
): Promise<{ nameMatchVerified: boolean; resolvedName: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.kycStatus !== "pending") {
    throw new AppError("KYC_STATE", "Phone must be verified before adding bank account", 400);
  }

  const existing = await prisma.creatorBankAccount.findUnique({ where: { creatorId: userId } });
  if (existing) throw new ConflictError("Bank account already registered");

  const psp = getPspClient(pspProvider);
  const resolved = await psp.resolveAccount(accountNumber, bankCode);

  // Name-match: compare resolved name to the display name on the user account.
  // Normalise both sides (uppercase, collapse whitespace) before comparing.
  const normalize = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
  const userName = normalize(user.email.split("@")[0]); // placeholder until display name exists
  const resolvedName = normalize(resolved.accountName);

  // Fuzzy match: accept if resolved name contains any word from the user name
  const userWords = userName.split(" ").filter((w) => w.length > 2);
  const nameMatchVerified =
    userWords.length === 0 ||
    userWords.some((word) => resolvedName.includes(word));

  await prisma.$transaction(async (tx) => {
    await tx.creatorBankAccount.create({
      data: {
        creatorId: userId,
        accountNumber,
        bankCode,
        resolvedAccountName: resolved.accountName,
        nameMatchVerified,
        verifiedAt: nameMatchVerified ? new Date() : null,
      },
    });

    if (nameMatchVerified) {
      // Verification complete — promote to tier1
      await tx.user.update({
        where: { id: userId },
        data: { kycStatus: KycStatus.verified },
      });
      await logTrustEvent(userId, "kyc_verified", "Phone + bank account verified", tx);
    }
    // Mismatched name: leave as pending, admin resolves manually
  });

  return { nameMatchVerified, resolvedName: resolved.accountName };
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function createUser(params: {
  email: string;
  phone: string;
  password: string;
  role: "brand" | "creator";
}): Promise<{ id: string }> {
  const exists = await prisma.user.findUnique({ where: { email: params.email } });
  if (exists) throw new ConflictError("Email already registered");

  const passwordHash = await bcrypt.hash(params.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: params.email,
        phone: params.phone,
        passwordHash,
        role: params.role,
      },
    });

    if (params.role === "creator") {
      await tx.creatorProfile.create({
        data: {
          userId: u.id,
          socialHandles: {},
          nicheTags: [],
          languages: [],
        },
      });
    } else {
      await tx.brandProfile.create({
        data: { userId: u.id },
      });
    }

    return u;
  });

  return { id: user.id };
}

export async function verifyPassword(email: string, password: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("AUTH_FAILED", "Invalid credentials", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("AUTH_FAILED", "Invalid credentials", 401);

  return user.id;
}
