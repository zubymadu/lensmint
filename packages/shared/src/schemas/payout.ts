import { z } from "zod";

export const CampaignFundingSchema = z.object({
  campaignId: z.string().cuid(),
  pspProvider: z.enum(["paystack", "moniepoint", "opay"]),
  currency: z.enum(["NGN", "USD"]),
});

// Payout ladder evaluation result
export const PayoutCalculationSchema = z.object({
  claimId: z.string().cuid(),
  verifiedViews: z.number().int().nonnegative(),
  verifiedClicks: z.number().int().nonnegative().optional(),
  verifiedSales: z.number().int().nonnegative().optional(),
  calculatedAmount: z.number().nonnegative(),
  currency: z.enum(["NGN", "USD"]),
  tierMatched: z.string(),
});

export type CampaignFundingInput = z.infer<typeof CampaignFundingSchema>;
export type PayoutCalculation = z.infer<typeof PayoutCalculationSchema>;
