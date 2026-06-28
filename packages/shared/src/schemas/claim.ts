import { z } from "zod";

export const SubmitClaimLinkSchema = z.object({
  submittedUrl: z.string().url(),
  screenshotUrl: z.string().url().optional(), // required for ephemeral content
});

export const SeedingAddressSchema = z.object({
  addressText: z.string().min(10),
  pickupPointId: z.string().optional(),
});

export const StreamingClaimSchema = z.object({
  scheduledSegmentTime: z.string().datetime().optional(),
});

export type SubmitClaimLinkInput = z.infer<typeof SubmitClaimLinkSchema>;
export type SeedingAddressInput = z.infer<typeof SeedingAddressSchema>;
