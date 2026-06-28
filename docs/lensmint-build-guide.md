# Lensmint Build Guide — Vibe Coding Sequence for Claude Code

## Setup (do this once, before the first prompt)

1. Drop the 7 skill folders from `lensmint-skills.zip` into `.claude/skills/` at your project root (or `~/.claude/skills/` if you want them available across projects).
2. Place `lensmint-product-scope.md` at `docs/lensmint-product-scope.md` in the repo — every skill references it as ground truth for anything not covered in the skill itself.
3. Initialize a monorepo: `apps/web` (Next.js), `apps/mobile` (Expo/React Native), `apps/api` (Node/TypeScript backend), `packages/shared` (shared TypeScript types/business logic), `workers/` (background jobs).
4. Confirm the open decisions in Section 13 of the scope doc that block early work — tech stack, KYC provider, commission rate — before Step 1. Everything else can be decided as you reach it.

Each step below names which skill(s) should be active. Claude Code auto-loads skills by description match, but for early sessions it's worth explicitly naming the skill in your prompt until the codebase has enough context for auto-triggering to be reliable.

---

## 1. Data Model & Schema Foundation
**Purpose:** Stand up the Postgres schema and shared TypeScript types from Section 10 before any business logic exists.
**Skills active:** none yet — this is pure scaffolding.
**Prompt:**
"Read docs/lensmint-product-scope.md Section 10 (Data Model) and Section 9.1-9.4. Generate a Postgres schema (via your ORM of choice — propose one if undecided) covering every entity listed: User, CreatorProfile, BrandProfile, Campaign, CampaignClaim, SubmissionEvent, QualificationResult, Metric, Payout, TrustEvent, ProductInventory, SeedingClaim, ShippingAddress, StreamingClaim, CampaignFunding, CreatorBankAccount, LedgerEntry, PoliticalReviewQueue, SensitiveContentFlag, AuditLog. Generate matching shared TypeScript types in packages/shared. Don't implement business logic yet — schema and types only."
**Why effective:** Every later step depends on having these entities exist correctly. Getting this wrong early compounds.
**Expected output:** Migration files, ORM models, shared type definitions.

## 2. Identity & Trust Tier System
**Purpose:** Build BVN/NIN verification and the Tier 0-3 progression before anything that depends on it.
**Skills active:** `lensmint-compliance`
**Prompt:**
"Implement creator and brand identity verification per lensmint-compliance: BVN/NIN check via [chosen KYC provider], Trust Tier 0→1 progression on verification, Tier 1→2→3 progression rules from Section 3.5. Include the TrustEvent logging for completed campaigns and fraud flags."
**Expected output:** KYC integration, trust tier state machine, TrustEvent write paths.

## 3. Core Campaign Mechanics
**Purpose:** Open campaign creation, claim flow, qualification-path selection, budget model.
**Skills active:** `lensmint-compliance`, `lensmint-payout`
**Prompt:**
"Implement campaign creation and the open, non-exclusive claim flow from Section 3.1-3.3. Campaigns must branch on complianceTier per lensmint-compliance. Implement the payout ladder structure (not values yet — the configurable structure) per lensmint-payout."
**Expected output:** Campaign CRUD, claim creation with trust-tier gating, payout ladder schema validation.

## 4. Submission & Qualification Pipeline
**Purpose:** The link-submission step, attribution checks, and AI qualification routing.
**Skills active:** `lensmint-qualification`
**Prompt:**
"Implement the submission flow per lensmint-qualification: creator submits a post/VOD link, system runs existence/timing/attribution checks (SubmissionEvent), then routes to the correct AI qualification method by content type. Start with the asset/audio-matching content types (banner/card overlay, branded sound, discount code) since they're highest-reliability — implement those qualification methods first, stub the vision/transcript methods for step 5."
**Expected output:** Submission endpoint, SubmissionEvent verification logic, qualification routing for asset-match content types.

## 5. AI Qualification — Vision, Audio, Transcript
**Purpose:** Fill in the remaining qualification methods.
**Skills active:** `lensmint-qualification`
**Prompt:**
"Implement the remaining qualification methods from lensmint-qualification: computer vision for brand/logo/promo-wearable detection, audio fingerprinting, transcript + Claude API sentiment/stance classification. Wire confidence routing to pass/fail/needs_review, with political and personal-sensitive content always forced to needs_review regardless of confidence."
**Expected output:** Vision/audio/transcript pipelines, confidence-based routing, hard-coded review overrides for political/personal categories.

## 6. Financial Flow
**Purpose:** Escrow, commission, ledger, and bank transfer payout.
**Skills active:** `lensmint-financials`
**Prompt:**
"Implement campaign funding and payout per lensmint-financials: Paystack/Flutterwave deposit with commission calculated at funding time, escrow held through the PSP partner, CreatorBankAccount with PSP account-resolution and name-match verification, LedgerEntry writes for every financial movement, and the campaign-close refund flow."
**Expected output:** Funding endpoint, payout release logic, ledger writes, refund job stub (full automation in step 10).

## 7. Seeding & Logistics
**Purpose:** Product/merch campaigns with courier integration.
**Skills active:** `lensmint-payout`
**Prompt:**
"Implement product/merch seeding from Section 5: capped claim model gated at Tier 1+, the claim→approved→shipped→delivered_confirmed→content_window_open state machine, Sendbox courier integration with webhook-driven delivery confirmation, and the three seeding payout models per lensmint-payout."
**Expected output:** Seeding claim flow, Sendbox integration, inventory tracking.

## 8. Streaming Campaigns
**Purpose:** Live streaming support with eligibility gating.
**Skills active:** `lensmint-qualification`, `lensmint-payout`
**Prompt:**
"Implement streaming campaigns from Section 6: eligibility criteria checked at claim time (not platform-wide gatekeeping), sponsored_segment and ambient_display qualification subtypes, Twitch/YouTube Live API integration for metrics, and the three streaming payout models."
**Expected output:** Streaming claim flow with eligibility checks, Twitch/YouTube Live API integration, streaming-specific metrics.

## 9. Compliance Review Queues
**Purpose:** Political and Personal/Individual admin review workflows.
**Skills active:** `lensmint-compliance`
**Prompt:**
"Implement the PoliticalReviewQueue and SensitiveContentFlag admin workflows per lensmint-compliance: manual checklist for identity/disclosure/funding-source/election-window on political claims, sensitive-content flagging for personal-tier medical/fundraising/third-party-named content, and the political-content-detection check that redirects mis-categorized personal campaigns."
**Expected output:** Admin review API endpoints and queue logic for both compliance-sensitive categories.

## 10. Background Automations
**Purpose:** Every job that runs without a direct user request.
**Skills active:** `lensmint-automations`
**Prompt:**
"Set up the worker/queue infrastructure and implement every job listed in lensmint-automations: submission verification, qualification processing, payout hold-release, budget pacing recalculation, campaign-close/refund, courier webhooks, streaming webhooks, fraud anomaly detection, trust tier recalculation, and ledger reconciliation. Make every job idempotent against double-payout and double-ledger-write."
**Expected output:** Queue setup, all listed workers, idempotency keys on financial jobs.

## 11. Responsive Web App
**Purpose:** Brand dashboard, creator dashboard, public campaign browsing, admin panel.
**Skills active:** `lensmint-web`
**Prompt:**
"Build the three web surfaces per lensmint-web: brand campaign creation/funding/performance dashboard, creator campaign browse/claim/submit/earnings dashboard, and the admin review panel covering qualification, political, and personal-sensitive queues. Mobile-first responsive, low-data mode by default."
**Expected output:** Three role-distinct web UIs.

## 12. Mobile App
**Purpose:** The primary creator-facing surface.
**Skills active:** `lensmint-mobile`
**Prompt:**
"Build the creator-focused mobile app per lensmint-mobile: identity verification flow, campaign browse with eligibility-aware streaming filters, claim flow with courier address autocomplete for seeding, the submit-link return flow, trust tier progress display, and payout/held-payout status. Include push notifications for claim confirmations, qualification results, and payout events."
**Expected output:** Functional creator app covering the full claim-to-payout journey.

## 13. Testing & Launch Readiness
**Purpose:** Close the loop before real money and real campaigns flow through the system.
**Prompt:**
"Run through the full creator and brand journeys end to end across web and mobile. Verify: no Tier 0 user can claim anything; political claims never auto-pass; commission is deducted once, at funding, never twice; payout to a name-mismatched account is held, not released; refunds trigger correctly at campaign close. Flag anything in docs/lensmint-product-scope.md Section 13 (Open Decisions) still unresolved before considering this launch-ready."
**Expected output:** A test pass against the platform's actual highest-consequence rules, and a clear list of remaining open decisions.

---

## Notes on sequencing
This order follows genuine dependency, not caution-based phasing — consistent with the "full build scope" decision earlier in this project. Steps 1-2 are true prerequisites for everything after. Steps 3-9 could be reordered somewhat (e.g., financials before seeding) without breaking anything, but qualification (4-5) should land before streaming (8) since streaming qualification reuses the same routing logic. Automations (10) deliberately comes after the domain logic it automates exists, since you can't write a payout hold-release job before payout logic itself is implemented.
