import { z } from "zod";

export const SignUpSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  password: z.string().min(8),
  role: z.enum(["brand", "creator"]),
});

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const BankAccountSchema = z.object({
  accountNumber: z.string().regex(/^\d{10}$/),
  bankCode: z.string().min(3).max(10),
});

export const CreatorProfileSchema = z.object({
  socialHandles: z.record(z.string(), z.string()),
  streamingHandles: z.record(z.string(), z.string()).optional(),
  nicheTags: z.array(z.string()),
  languages: z.array(z.string()),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
export type BankAccountInput = z.infer<typeof BankAccountSchema>;
