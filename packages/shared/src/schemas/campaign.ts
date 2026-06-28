import { z } from "zod";

export const PayoutLadderTierSchema = z.object({
  minViews: z.number().int().nonnegative(),
  maxViews: z.number().int().positive().optional(),
  baseRatePer1k: z.number().nonnegative(),
  multiplier: z.number().positive().default(1),
});

export const PayoutLadderSchema = z.object({
  currency: z.enum(["NGN", "USD"]),
  minimumThreshold: z.number().int().nonnegative(),
  tiers: z.array(PayoutLadderTierSchema).min(1),
  conversionBonusPerClick: z.number().nonnegative().optional(),
  conversionBonusPerSale: z.number().nonnegative().optional(),
});

export const EligibilityCriteriaSchema = z.object({
  minAvgViewers: z.number().int().nonnegative().optional(),
  minStreamHours30d: z.number().nonnegative().optional(),
  platformVerifiedRequired: z.boolean().optional(),
  niche: z.array(z.string()).optional(),
});

export const BrandAssetSchema = z.object({
  type: z.enum(["image", "video", "audio", "banner", "card"]),
  url: z.string().url(),
  name: z.string(),
  mimeType: z.string().optional(),
});

export const CreateCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  brief: z.string().min(10),
  platforms: z.array(z.string()).min(1),
  campaignType: z.enum(["standard", "seeding", "streaming"]),
  seedingSubtype: z.enum(["review_product", "promo_wearable"]).optional(),
  streamingSubtype: z.enum(["sponsored_segment", "ambient_display"]).optional(),
  eligibilityCriteria: EligibilityCriteriaSchema.optional(),
  contentTypes: z.array(z.string()).min(1),
  qualificationType: z.enum(["brand_material", "positive_mention"]),
  requiresDisclosureLabel: z.boolean().default(false),
  brandAssets: z.array(BrandAssetSchema).default([]),
  payoutLadder: PayoutLadderSchema,
  budgetCap: z.number().positive(),
  targetPeriodDays: z.number().int().positive().optional(),
  maxCreators: z.number().int().positive().optional(),
  currency: z.enum(["NGN", "USD"]).default("NGN"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type PayoutLadder = z.infer<typeof PayoutLadderSchema>;
export type EligibilityCriteria = z.infer<typeof EligibilityCriteriaSchema>;
