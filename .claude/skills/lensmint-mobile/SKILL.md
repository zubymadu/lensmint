---
name: lensmint-mobile
description: Use when building or modifying the Lensmint mobile app. Trigger on React Native/Expo code, app navigation, push notifications, or any mobile-specific implementation of the creator/brand flows.
---

# Lensmint Mobile App Conventions

Companion to `docs/lensmint-product-scope.md`. Covers the native app surface — most likely the **primary** surface for creators given the mobile-first user base described in Section 8.3.

## Stack recommendation (open decision — confirm before large investment)
Expo/React Native is the recommended default for cross-platform iOS + Android from one codebase, sharing TypeScript types and business logic with the web app via a shared package (e.g. `packages/shared`). This is a recommendation, not a locked decision — confirm against the project's actual open-decisions list before committing significant build time.

## Primary use case: creator, not brand
The mobile app's core audience is creators — "anyone with a viral concept," per the product vision — browsing campaigns, claiming, submitting content, and tracking earnings, often as their primary or only device. Brand-side campaign creation can live primarily on web; don't over-invest in a full brand-management mobile experience before the creator flows are solid.

## Core creator flows the app must support end-to-end
1. Sign-up → BVN/NIN identity verification (Tier 1) — this flow needs to handle the realities of mobile KYC: camera-based document capture, retry on poor connectivity, clear progress state
2. Browse open campaigns, filtered by platform/niche/eligibility (streaming campaigns show eligibility status inline — don't make a streamer discover they don't qualify only after attempting to claim)
3. Claim → for seeding, address entry with courier autocomplete (Section 5.3) and a pickup-point fallback option, since address entry on mobile is exactly where errors compound
4. Post content externally (TikTok/Instagram/etc.), then return to submit the link (Section 3.6) — design this as a fast, low-friction return flow; this is the single most repeated action in the app
5. Track claim status (qualifying → qualified → paid) and trust tier progression — make trust tier progress visible and concrete (e.g., "X more campaigns to Tier 2"), since this is the platform's core growth mechanic for new creators
6. View payout history and bank account status, including any held payouts pending name-match resolution (Section 8.4) — surface *why* something is held, don't leave creators guessing

## Notifications
Push notifications matter more on mobile than web for this audience — campaign claim confirmations, qualification results, payout releases, and held-payout resolutions are all worth a push notification, not just an in-app badge, given how often this audience may not have the app open.

## Low-data behavior
Same constraint as web (Section 8.3) but more acute on mobile: no autoplay, compressed previews by default, and design every screen assuming the creator may be on a slow or capped connection.
