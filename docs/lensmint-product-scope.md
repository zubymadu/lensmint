# Lensmint — Product Scope

**A performance-based, AI-verified creator marketplace for Nigeria.** Brands post open campaigns with a budget; any creator can pick one up, qualify by using brand materials or mentioning the brand positively, and get paid based on verified performance thresholds — without ever having to contact the brand directly.

---

## 1. Vision & Positioning

Existing influencer platforms (Aspire, Grin, Upfluence) gatekeep creators behind curated marketplaces, follower minimums, and enterprise contracts. Newer performance-based models (Whop Content Rewards, Dub Bounties, Canvas/Launchpoint) prove that "anyone can be a creator, paid on verified results" works — but they're built for US/global payment rails, US-scale ad budgets, and light-touch manual review.

Lensmint adapts that model for Nigeria's realities (naira volatility, NIP/USSD-based payment infrastructure, BVN/NIN identity verification, local logistics) and pushes it further: **AI handles qualification and budget pacing at scale**, so the platform can support truly open, no-follower-minimum, no-direct-contact participation. The goal is to democratize content creation — anyone with a viral concept can earn from it, without ever meeting or messaging a brand.

---

## 2. Core Users

**Brands / Campaign sponsors** — split into four compliance tiers (see Section 7):
- Commercial: SMEs, e-commerce, fintech/consumer apps, FMCG, diaspora/global brands
- Personal/Individual: independent individuals running personal campaigns (self-promotion, personal causes, fundraising, events) — own compliance tier given distinct fraud/scam and identity-verification needs (see Section 7.2)
- Government: public agencies running public-service or civic-awareness campaigns
- Political/Electoral: candidates and registered parties — highest compliance bar, gated by admin/human verification (see Section 7.4)

**Creators**
- No follower minimum — open to anyone with a public social account
- Ranges from total beginners to established creators, and includes live streamers (Section 6), including upcoming streamers who don't yet meet any given campaign's eligibility bar — they remain free to claim other campaigns with no or lower eligibility criteria
- Mobile-first, data-cost-conscious, primarily active on TikTok, Instagram, X, and (for streaming specifically) Twitch, YouTube Live, TikTok LIVE

---

## 3. Core Mechanics

### 3.1 Open Campaign Model
- Brands post a campaign with: brief, target platform(s), content type(s) (see Section 4), qualification rule, payout structure, budget (cap and/or target period), duration, and optionally a **creator cap** (`maxCreators`) limiting how many creators can claim regardless of remaining budget
- Campaigns are **non-exclusive** by default — multiple creators can claim the same campaign simultaneously (this is a bounty, not a 1:1 hire) — up to the creator cap if one is set
- Each creator who claims gets a unique tracked link and/or hashtag for attribution
- No direct brand-creator contact is required at any point in the flow

### 3.2 Qualification Criteria
A piece of content only becomes eligible for payout if it satisfies **one of two qualification paths**, set per campaign by the brand:

1. **Brand material usage** — creator uses brand-supplied assets (product images/video, logo, provided clip, banner, card, branded sound) visibly or audibly in their content
2. **Positive brand mention** — creator creates original content that mentions/reviews/recommends the brand favorably, without necessarily using supplied assets

Both paths are AI-verified before any performance metrics start counting toward payout (see Section 4 for content-type-specific verification methods, Section 9 for the underlying AI systems). A viral post that fails qualification earns nothing, regardless of views.

### 3.3 Budget Model
Brands choose one or more constraints when creating a campaign:
- **Budget cap**: total spend ceiling, regardless of how long it takes to exhaust
- **Target period**: budget paced across a defined time window rather than exhausted instantly by one early viral hit
- **Creator cap**: maximum number of creators who may claim, independent of budget remaining

When multiple constraints are set, the Budget Pacing Engine (Section 9.2) reconciles them.

### 3.4 Threshold-Based, Tiered Payout (the "ladder")
Payout scales non-linearly with verified performance, *after* qualification passes:

| Performance tier | Example payout logic |
|---|---|
| Below minimum threshold | $0 — no payout |
| Minimum threshold (e.g. 5K views) | Base rate per 1K views |
| Mid tier (e.g. 50K+ views) | Multiplier bonus (e.g. 1.5x base rate) |
| Viral tier (e.g. 500K+ views) | Higher multiplier (e.g. 2-3x base rate) |
| Conversion-based bonus (optional) | Extra payout per verified click/sale via affiliate link |

Exact thresholds/multipliers are configurable per campaign. Pre-filled defaults by campaign objective (awareness, conversion, app install, content-asset, local/SME) are a suggested future enhancement, not yet formally specified in this document.

### 3.5 Trust Tier System (fraud control + creator progression)
- **Tier 0 — Unverified**: can browse, cannot claim any paid or seeded campaign
- **Tier 1 — Identity Verified** (BVN/NIN + bank account confirmed): can claim standard campaigns and product/merch seeding, lower payout caps, longer hold period before payout release
- **Tier 2 — Established** (X completed campaigns, no fraud flags, consistent verified performance): higher payout caps, shorter hold period, access to bigger/exclusive campaigns
- **Tier 3 — Top Creator**: fastest/instant payout, optional guaranteed-floor deals, priority access to premium brand campaigns

Identity verification is a **gate to entry** for anything involving real cost (cash payout or physical goods), not something earned later. A no-show on a seeding claim (product/merch received, no qualifying content submitted by deadline) logs a negative `TrustEvent` — weighted *more heavily* than a missed performance threshold on a cash campaign, since the brand has already incurred a real, unrecoverable cost with nothing earned in return. The trust-tier penalty is the sole deterrent for seeding no-shows — no separate security deposit or card-hold is required.

### 3.6 Submission & Attribution
After publishing, the creator must explicitly submit the link to their post back into the platform — this is the universal, mandatory mechanism across every platform and content type (including the VOD link for streaming, Section 6.2, and the post link for seeding claims). The platform does not rely on automatically discovering content; the creator always tells it where to look.

On submission, the system fetches the link and runs three checks before anything else happens:
- **Existence**: the post is live and publicly accessible
- **Timing**: it was published after `claimedAt` and within the campaign's active window
- **Attribution**: it carries this specific claim's unique tracked link/hashtag, and belongs to the creator's verified social handle for that platform — not a different account, and not a different creator's claim on the same open campaign

Only once all three pass does the content move forward to AI qualification (Section 9.1) — qualification never runs on unverified or unattributed submissions. A mismatch (wrong account, missing tracked identifier, outside the campaign window) rejects the submission before qualification AI is invoked at all; repeated mismatches from the same creator are a fraud signal worth flagging to admin review, since it suggests an attempt to claim credit for someone else's content.

For ephemeral content (Stories/Status), the submitted link alone isn't sufficient since it disappears within 24 hours — the creator must also submit a timestamped screenshot/recording at the time of posting, consistent with the timing constraint noted in Section 4.

---

## 4. Content Types & Verification Methods

Each content type a brand can request maps to a specific AI verification method (Section 9.1), and these methods differ meaningfully in reliability. As a build-order principle: **types verified by exact asset/audio matching are far more reliable than types verified by judgment (sentiment, tone), and should ship first.**

| Content type | Description | Verification method | Reliability |
|---|---|---|---|
| Video ad | Full produced ad-style content featuring the brand | Transcript + LLM sentiment/stance | Medium |
| Video brand display | Brand product/logo visibly appears in video | Computer vision — object/logo detection | Medium (lighting, angle, occlusion affect accuracy) |
| Video brand banner/card, minimum duration | Brand-supplied graphic overlay shown for a set minimum duration | Asset/template matching against known brand graphic + frame-count duration check | High — exact known image match |
| Video brand mention/promotion by actor | Creator verbally mentions/endorses the brand | Transcript + LLM sentiment/stance | Medium (tone, sarcasm, context-dependent) |
| Text conversation starter | Text-only post mentioning the brand, written to invite engagement | Text-only NLP — brand mention + engagement-intent classification | Medium-high |
| Picture post | Brand product/logo appears in a still image | Single-frame computer vision | Medium |
| Picture banner/card overlay | Brand-supplied graphic overlay on a still image | Asset/template matching | High — exact known image match |
| Branded audio/sound usage | Creator uses a brand-supplied jingle/sound clip as background audio, in any content | Audio fingerprinting (exact match) | High — no visual ambiguity, no sentiment judgment |
| Voice note / audio-only promotion | Spoken endorsement with no video, common given WhatsApp voice-note culture | Transcript + LLM sentiment/stance | Medium |
| Discount/referral code mention | Creator states or writes a unique code (layered onto any other type) | Exact-string match against assigned code in transcript/caption | High |
| Skit/comedy with embedded brand integration | Comedic content with brand placement or mention | Same as video display/mention, but flagged for tone risk | Lower confidence by default — sarcastic/exaggerated comedic delivery can misclassify as negative; route more of these to human review |
| Carousel/multi-image post | Multi-slide Instagram/Facebook post | Vision/asset-matching applied across the full slide set, not just the first image | Medium |
| Story/status post (ephemeral) | Disappears after 24 hours (Instagram/Facebook/WhatsApp Stories) | Same methods as the underlying format, but requires near-real-time capture (screenshot/recording with timestamp) and a shorter verification SLA than the standard hold-and-verify window | Medium — timing-constrained, not method-constrained |

**Explicitly excluded from scope**: brand-positive comments posted on others' viral content ("comment marketing"). The verification and fraud profile is nearly identical to comment-farming/bot abuse the platform is already trying to screen out, and reliably distinguishing genuine engagement from coordinated comment-spam is a harder problem than anything else on this list. Left out entirely rather than weakly controlled.

**Mapping to campaign objectives** (informal guidance, not enforced defaults):
- Awareness/FMCG → picture/video brand display, branded sound usage
- Conversion/e-commerce → video ad, video mention + discount code
- App install/fintech → video brand mention by actor, voice note
- Content asset generation → video ad, picture post
- Local/foot-traffic SME → text conversation starter, picture post

---

## 5. Product & Merchandise Seeding

A distinct campaign type where the brand ships a physical item to the creator before any content is created — this breaks the "brand pays nothing until a threshold clears" pattern used elsewhere, so it needs its own claim, fulfillment, and risk model.

### 5.1 Seeding Subtypes
- **`review_product`**: the item is the subject of the content (review, demo, unboxing). Qualification leans on the positive-mention path — sentiment/stance classification on transcript + caption.
- **`promo_wearable`**: items like shirts and caps used as wardrobe/prop in otherwise unrelated content (a dance video, a vlog, a skit). Qualification is visual presence, not sentiment — computer-vision detection that the branded item is visibly worn/displayed for a minimum duration, with no requirement that the content be "about" the brand at all. Lower per-unit cost typically means brands want higher creator caps and lighter approval friction for this subtype.

### 5.2 Claim & Fulfillment Flow
Because real cost is committed at claim time, seeding campaigns use a **capped, gated claim model**, not a fully open one:
- Claims are limited by `unitsAvailable` (inventory), not just budget or creator cap
- Only **Tier 1+ identity-verified creators** can claim — no Tier 0 access
- Brands may optionally require approval per claim (useful for higher-value products), or auto-approve based on trust tier and niche fit
- Sizing/variant selection (sizes, colors) required at claim time for apparel-type items

State machine:
```
claimed → approved → shipped → delivered_confirmed → content_window_open → content_submitted → qualified → paid
```
The content submission deadline counts from `delivered_confirmed`, not from claim time, since delivery timing varies by location and courier.

### 5.3 Logistics Integration
- Route shipping through existing Nigerian courier APIs rather than building custom logistics — Sendbox, GIG Logistics (GIGL), and Kwik Delivery all support order creation, tracking, and delivery-status webhooks
- Sendbox is the likely first integration given its existing focus on social-commerce sellers (Instagram/WhatsApp-first merchants), closer to Lensmint's brand profile than enterprise-oriented GIGL
- Delivery confirmation should arrive as a webhook that automatically opens the content submission window — removes a manual admin step and avoids "I never received it" disputes without a tracked delivery event
- Address input should use courier address-autocomplete/suggestion APIs rather than a free-text field, given how common address-entry errors are in Nigerian last-mile delivery
- Offer a **pickup-point option** (courier experience centres/agent network) as a fallback for creators without a reliable delivery address

### 5.4 Payout Structures for Seeding

| Model | Structure | Best for |
|---|---|---|
| Gifted-only | Product = full compensation, no cash payout | Small brands, low-cost products, pure exposure deals |
| Gifted + performance bonus | Product is base compensation, cash bonus above a view/engagement threshold | Default — mirrors the seeding-plus-affiliate pattern that works well elsewhere |
| Gifted + flat completion fee | Product + small fixed cash payment on qualifying submission, no ladder | Mid-tier creators, simpler brand budgeting |

---

## 6. Streaming Campaigns

Live streaming is a fundamentally different content format from the discrete posts covered in Section 4 — there's no fixed clip boundary, verification has to work against a continuous broadcast (live and/or recorded VOD), and brands often want a scheduled, higher-touch integration rather than an incidental mention. Following the same model used by platforms like Verifluence — verify identity, apply or claim a deal, deliver, get paid — Lensmint supports streamers, including upcoming/new streamers, on the same open-but-eligibility-gated principle used elsewhere on the platform.

### 6.1 Eligibility, Not Gatekeeping
This is a deliberate distinction from the curated, follower-minimum marketplaces critiqued earlier in this document (Aspire/Grin/Upfluence-style gatekeeping):
- Brands set campaign-specific eligibility criteria (e.g., minimum average concurrent viewers, minimum total stream hours in the past 30 days, platform-verified status, niche/category fit) — a **transparent, per-campaign minimum**, not a platform-wide follower threshold that locks out new streamers entirely
- Criteria are checked automatically against the streamer's verified platform stats at claim time — failing one campaign's bar doesn't block a streamer from claiming others with a lower or no eligibility requirement
- Campaigns with no eligibility criteria set function exactly like the open-claim model used elsewhere, keeping the door open for streamers still building their first audience
- Tier 1+ identity verification (Section 3.5) still applies regardless — eligibility criteria are an additional, campaign-specific filter layered on top of the platform-wide trust tier system, not a replacement for it

### 6.2 Qualification Subtypes
- **`sponsored_segment`**: a scheduled, time-boxed portion of the stream dedicated to the brand (a mid-stream ad read, a branded segment) — verified via VOD review: transcript + LLM sentiment/stance on the segment, cross-checked against the scheduled timestamp
- **`ambient_display`**: a brand overlay, banner, or logo displayed persistently during the stream — verified via asset/template matching against the known brand graphic, with a minimum total on-screen duration calculated across the full stream length, the same principle as the video brand banner/card type in Section 4 but measured continuously rather than per-clip

### 6.3 Streaming-Specific Metrics
Streaming performance doesn't map cleanly onto the view-count payout ladder used for short-form content:
- Average concurrent viewers (during the sponsored segment or full stream)
- Peak concurrent viewers
- Total watch-time minutes
- New followers/subscribers gained during the stream
- Chat engagement volume (directional signal only — not used as a primary payout metric, since chat activity is easily manipulated)

### 6.4 Verification Method by Platform
- **API-verifiable platforms** (Twitch, YouTube Live): real-time and post-stream viewer/watch-time data pulled directly via platform API — high reliability, the same principle as the API-verifiable platforms in Section 9.1
- **Limited-API platforms** (TikTok LIVE, Facebook Gaming): rely more heavily on VOD-based post-hoc review until API access matures — lower reliability, higher human-review rate, consistent with how other non-API platforms are handled

### 6.5 Payout Structures for Streaming

| Model | Structure | Best for |
|---|---|---|
| Flat per-stream segment fee | Fixed payout for completing a scheduled sponsored segment, no performance scaling | Upcoming streamers — lowest-risk entry point for both sides |
| Viewer-threshold bonus | Base fee plus bonus scaling with average concurrent viewers during the segment | Default — mirrors the tiered payout ladder logic used for short-form content |
| Ambassador retainer | Recurring fee for an ongoing multi-stream relationship over a defined period | Established (Tier 2/3) streamers with a consistent audience |

This mirrors the range platforms like Verifluence already offer — deals spanning per-stream payments to monthly ambassador packages — without requiring brands to negotiate each deal individually; the structure is set once per campaign, and any eligible streamer can claim it.

---

## 7. Campaign Categories & Compliance Tiers

"Brand" generalizes to any lawful promotable entity — products, services, causes, events, government messaging, political/electoral messaging, and individual/personal promotion — but these do **not** share a single compliance bar. Four tiers, increasing in required rigor:

### 7.1 Commercial
Standard flow as described in Sections 3-6. Subject to Nigeria's ARCON (Advertising Regulatory Council of Nigeria) requirements: paid partnerships must be disclosed (content failing to include a sponsorship disclosure should fail qualification), and content must avoid false/exaggerated claims, misinformation, or discriminatory material. This applies regardless of campaign size — even informal social content can fall under ARCON's scope.

### 7.2 Personal / Individual
Independent individuals running their own campaigns — self-promotion (aspiring artists/musicians, job-seekers), personal causes and fundraising (medical bills, school fees, small personal hustles), or personal events. This sits in its own tier rather than folding into Commercial, because the risk profile is genuinely different:

- **Identity verification is mandatory before launch, not optional** — an individual sponsor must reach the same BVN/NIN-verified standard required of creators (Section 3.5, Tier 1+) before any personal campaign can go live. Anonymous or unverified individuals cannot fund campaigns, full stop — this is the primary defense against fraudulent fundraising and scam "causes."
- **Funding restricted to the individual's own verified bank account** — no third-party or pooled funding for this tier at launch, which keeps the fraud surface simple and auditable.
- **Sensitive content categories route to mandatory human review** — medical/fundraising claims and any content involving real, named third parties (missing-person appeals, personal disputes) are exactly the kind of emotionally persuasive content prone to scam exploitation or to targeting/harassment of a named individual. These do not get AI auto-pass regardless of confidence, similar in spirit to the political category's review requirement, though the review queue itself is distinct.
- **No campaigns targeting or naming private individuals negatively** — this is a hard content rule, not a judgment call left to the qualification AI; flagged content routes straight to admin review and the campaign is rejected if it amounts to harassment or defamation of a named person.
- **Lighter campaign templates** — simpler flat-rate-per-qualifying-post structures by default rather than the full multi-tier payout ladder, since personal budgets are typically much smaller than brand budgets (mirrors the local/SME template logic discussed for commercial campaigns).
- **Political content detection applies regardless of declared category** — if a "personal" campaign's content is actually electoral/political in substance (e.g., promoting a candidate), it must be redirected to the Political/Electoral review process (Section 7.4) rather than allowed to bypass those controls by being filed under Personal.

### 7.3 Government (Public Service)
Civic-awareness and public-service campaigns (health awareness, tax compliance reminders, voter education, etc.) run by verified government agencies. Closer in risk profile to a cause/advocacy commercial campaign than to electoral campaigns:
- Requires verified-government-account identity check before a campaign can be created
- Same qualification/payout mechanics as commercial campaigns
- Funding must be traceable to the sponsoring agency (relevant for public-funds audit/transparency expectations)

### 7.4 Political / Electoral (highest compliance tier — gated entirely by admin/human verification for now)
Campaigns from candidates or registered political parties carry materially higher legal and reputational risk than any other category. This category is included in the full build, with the following controls active from launch as a **manual admin verification process**; automated enforcement of the funding-source and election-blackout checks (Section 12) is a near-term technical dependency rather than a deferred feature — it activates once the supporting integrations and a maintained election-calendar source are in place:

- **Verified political identity at onboarding**: admin manually confirms registered-party/candidate status (INEC registration reference, party documentation) before approving an account into `complianceTier: political`. A commercial brand account cannot self-upgrade into this tier.
- **Disclosure checked manually**: admin reviewer confirms a paid/political disclosure label is present on submitted content as part of the same review pass — no separate automated gate yet.
- **No AI auto-approval, ever**: every claim in this category routes unconditionally to a dedicated human review queue, regardless of AI confidence score. Reviewer identity, timestamp, and decision rationale are logged for every review.
- **Funding source checked manually**: admin confirms the funding account is Nigerian-domiciled before approving a political campaign's funding — not yet enforced automatically at the payment API level.
- **Election blackout checked manually**: admin checks current claims/content submissions against known election dates before approving; no automated `BlackoutWindow` enforcement yet.
- **Equal treatment as reviewer policy**: the same admin review checklist and turnaround standard applies to every verified political account — enforced operationally for now rather than in code.
- **Full audit logging from day one**: every political-category campaign creation, funding approval, review decision, and payout is still logged via `AuditLog`, regardless of how much of the underlying check is manual — this preserves a clean record even before enforcement is automated.

**Legal note**: manual verification reduces engineering scope but does not reduce legal exposure — the same recommendation applies: confirm with legal counsel that this process satisfies ARCON, Electoral Act 2026, and NDPA requirements before onboarding real political actors, and treat the admin review checklist itself as something worth having counsel review.

---

## 8. Nigeria-Specific Requirements (non-negotiable design constraints)

### 8.1 Payment & Currency
- Collection & payout via Paystack and/or Flutterwave — route through a licensed partner rather than building custom escrow/wallet infrastructure
- Fast payout for verified tiers — avoid long naira hold periods; inflation erodes value while funds sit. Tier 2/3 creators should get same-day or instant payout via NIP rails
- Offer payout currency choice: naira (instant, default) or USD-pegged stablecoin (hedge against naira volatility)
- USSD support for account verification/notifications where feasible

### 8.2 Identity & Compliance
- BVN or NIN verification required at Tier 1 — partner with a licensed KYC/PSP provider rather than storing raw identity numbers directly
- Comply with Nigeria Data Protection Act (NDPA 2023) for identity and financial data
- ARCON compliance for disclosure/truthfulness in commercial, personal, and government content (Section 7.1-7.3); additional Electoral Act and NITDA Code of Practice compliance required before fully launching Section 7.4 to real political actors

### 8.3 Platform & Content Design
- Prioritize TikTok, Instagram, X integrations first; Facebook/Snapchat secondary; Twitch and YouTube Live as the primary streaming-platform integrations given API reliability (Section 6.4), with TikTok LIVE and Facebook Gaming layered in afterward
- Low-data mode: compressed previews, no forced autoplay, lightweight mobile web experience
- Niche/language tagging: Pidgin, Yoruba, Igbo, Hausa, comedy/skits, Afrobeats/dance, fintech reviews, gaming/lifestyle streaming, etc.

### 8.4 Financial Model & Escrow Flow

**Revenue model**: Lensmint earns a platform commission charged to the brand on total campaign budget, not skimmed from creator payouts — creators receive the full advertised payout from the payout ladder, full stop. This keeps creator earnings predictable, which matters directly to the platform's "anyone can earn" positioning: a creator who clears a 50K-view threshold should see exactly the payout the ladder promised, with no reduced amount after platform deductions.

- Suggested starting commission: 10-15% of total campaign budget, charged to the brand at funding time — meaningfully higher than the thin 3-5% transaction-fee model considered earlier in this project's design history and found insufficient to cover PSP processing costs, KYC/identity verification costs, AI compute, and admin review staffing, but still well below the $2,000+/month enterprise contracts charged by Aspire/Grin/Upfluence — preserving the self-serve, transparent-pricing differentiator central to this platform's positioning
- No separate SaaS subscription tier at launch — self-serve, pay-per-campaign pricing is the differentiator against the enterprise-contract model; a subscription tier (e.g. a discounted commission rate for high-volume brands) is a reasonable future addition once real usage data exists to price it against
- Paystack/Flutterwave's own processing/transfer fees are a platform cost, absorbed within the commission rather than itemized as a separate, surprise line item to either brand or creator

**Escrow flow**:
1. Brand creates a campaign and deposits the full campaign budget plus platform commission at funding time, via Paystack/Flutterwave
2. Funds sit in escrow held through the licensed PSP partner (Section 8.1) — Lensmint does not hold customer funds directly, consistent with the licensing constraint already established
3. As creators clear payout thresholds, the *net* campaign budget (deposit minus commission) is what's available for creator payouts — commission is recognized as platform revenue at funding time, not deducted a second time at payout
4. At campaign close (budget exhausted, creator cap reached, or duration elapsed), any unspent net budget is refunded to the brand automatically, minus any non-refundable PSP fee already incurred on the original deposit

**Direct bank transfer payout mechanics**:
- Creators add a bank account (account number + bank code) at Tier 1 verification
- The account is resolved via Paystack/Flutterwave's account-resolution API, which returns the account holder's name directly from the bank — this resolved name is checked against the creator's BVN/NIN-verified identity name before the account can be used for payout
- This name-match check is a meaningful anti-fraud control on top of everything else in this design: it prevents a creator from quietly routing payouts to a different person's account, which matters given how heavily this whole system already leans on identity verification as its core trust mechanism
- Payout to a verified, name-matched account proceeds via Nigeria's NIP rails — same-day or instant for Tier 2/3 creators, consistent with the fast-payout requirement already established to protect against naira value erosion (Section 8.1)
- A mismatched name doesn't auto-reject outright — it routes to admin review, since legitimate cases exist (e.g., a maiden-name mismatch); but payout is held until resolved

**Ledger & reconciliation**: every financial movement — brand deposit, platform commission, creator payout, refund — is recorded in a single ledger, both to extend the audit-logging requirements already specified for Political/Government campaigns (Section 7.3-7.4) into standard financial hygiene across all categories, and to give Lensmint itself a clean, reconcilable record of revenue versus pass-through campaign funds.

**Illustrative unit economics** (per campaign, needs validation against real campaign-budget data once live): assuming a ₦200,000 average campaign budget, 12% platform commission, ~5 creator payouts and ~5 AI qualification checks per campaign, and one flagged item routed to admin review:

| Line item | Cost |
|---|---|
| PSP deposit fee (1.5% + ₦100, capped at ₦2,000) | ₦2,000 |
| Payout transfers (5 × ~₦35 NIP transfer fee) | ₦175 |
| Amortized BVN/NIN identity verification | ~₦50 |
| AI qualification compute (mostly Haiku-tier classification, Sonnet-tier for flagged content) | ~₦75 |
| Admin review (1 flagged item, fully-loaded reviewer cost) | ~₦226 |
| **Total variable cost per campaign** | **~₦2,526** |
| **Commission revenue (12% of ₦200,000)** | **₦24,000** |
| **Gross margin per campaign** | **~₦21,474 (~89%)** |

Notably, AI qualification compute is not the dominant cost line — it's comparable to the PSP fee and smaller than admin review. The real argument for a 10-15% commission over the thinner 3-5% model considered earlier in this project's design history isn't unit-level margin (even 3% remains margin-positive at this scale) — it's that thin commissions require roughly 4x the campaign volume to cover *fixed* costs (engineering, compliance/legal, customer acquisition) that don't scale with any single campaign.

**Competitive comparison**:

| Platform | Pricing model | Contract | Creator payout |
|---|---|---|---|
| Grin | ~$399-2,500+/month | 12-month commitment typical | PayPal-only, limited currency flexibility |
| Aspire | ~$2,300/month, unpublished | Custom quote, annual | Varies by deal |
| Upfluence | ~$2,000-2,478/month, module-based | Annual commitment (~$24k/year total) | PayPal and Stripe, multi-currency |
| Whop Content Rewards | Free for creators; brand funds pay-per-view bounty | None — self-serve | Paid automatically per 1,000 views, uncapped |
| Dub Bounties | Free for partners; business funds the bounty | Self-serve SaaS tiers for the business side | Automated tracking and payout per social metric |
| Verifluence | KYC-gated marketplace, on-chain escrow per deal | Self-serve, per-deal | Escrow-backed USDT, released on confirmed delivery |
| **Lensmint** | **No subscription; 10-15% commission on campaign budget at funding** | **Self-serve, per-campaign** | **Full ladder amount, NGN bank transfer (instant/same-day) or stablecoin** |

The positioning gap this confirms: every enterprise competitor above locks brands into $2,000+/month annual contracts before they've proven the model works for them — exactly the friction Lensmint's self-serve, pay-per-campaign commission model avoids, while the performance-bounty platforms (Whop/Dub) independently validate that a transparent, no-subscription model is commercially viable at real scale.

---

## 9. AI System Components

### 9.1 Content Qualification AI
Qualification only runs on submissions that have already passed the Submission & Attribution checks in Section 3.6 — existence, timing, and account/tracked-identifier ownership are confirmed before any AI verification touches the content. Verification method is then selected per content type — see Section 4 for the full type-to-method mapping, and Section 6.4 for streaming-specific methods. In general:
- **Asset/audio matching** (banners, cards, overlays, branded sound, discount codes): exact-match against known brand-supplied assets or strings — highest reliability, recommended to ship first
- **Computer vision** (brand/logo/product display, promo-wearables, streaming ambient display): object detection with minimum visible-duration checks where relevant
- **Transcript + LLM sentiment/stance** (video ads, mentions, voice notes, text conversation starters, streaming sponsored segments): judgment-based, tone and brand-relevance both matter, lower reliability than the above
- **Disclosure check** (commercial/government/political): verifies a sponsorship/paid-content label is present where required; absence fails qualification automatically
- **Comedic/skit content**: flagged for lower default confidence given sarcasm/tone misclassification risk; routes to human review more readily than straightforward testimonial content
- **Output**: pass / fail / "needs human review" — low-confidence cases route to a manual admin queue rather than forcing a binary call
- **Political/electoral content**: no auto-pass under any confidence threshold — always routes to human review (Section 7.4)
- **Personal/Individual sensitive content** (medical/fundraising claims, content naming real third parties): no auto-pass — routes to human review (Section 7.2)
- **Appeal flow**: creators can contest a failed qualification; routes to human review

### 9.2 Budget Pacing Engine
- Rule-based allocation of remaining budget proportionally across remaining campaign duration and/or creator cap
- Tie-break rule (open decision, Section 13) for what happens when multiple creators clear payout thresholds simultaneously and budget/cap is insufficient for all of them

### 9.3 Fraud & Anomaly Detection AI
- Anomaly detection on view/engagement velocity and patterns (bot/farm signatures)
- Cross-reference against creator's historical pattern and trust tier
- Flags route to hold/review, not automatic rejection

### 9.4 Creator-Campaign Matching
- Recommend relevant open campaigns to creators based on niche, language, and past performance — for streamers, this extends to matching against eligibility criteria so streamers see which campaigns they already qualify for versus which are aspirational

---

## 10. Data Model (entity-level, DB-agnostic)

**User** — id, role (brand/creator/admin), email, phone, trustTier, kycStatus, bankAccountRef, createdAt

**CreatorProfile** — userId, socialHandles {platform: handle}, verifiedFollowerCounts, niche tags, language, completedCampaignsCount, fraudFlags, streamingHandles (nullable, {platform: handle}), verifiedAvgViewers (nullable), verifiedStreamHours30d (nullable)

**BrandProfile** — userId, businessName (nullable for personal tier — use individual's display name instead), businessType (nullable for personal tier), complianceTier (commercial/personal/government/political), verificationStatus, politicalRegistrationRef (nullable, INEC/party registration reference, manually confirmed by admin for political tier)

**SensitiveContentFlag** — claimId, category (medical_fundraising/missing_person/third_party_named/political_in_disguise), assignedReviewerId, status (pending/approved/rejected), decisionRationale, decidedAt — used for Personal/Individual tier content requiring mandatory human review (Section 7.2), separate from the PoliticalReviewQueue but following the same no-auto-pass principle

**PoliticalReviewQueue** — claimId, assignedReviewerId, status (pending/approved/rejected), checklistResult (JSON: identityConfirmed, disclosurePresent, fundingSourceNigerian, withinAllowedElectionWindow), decisionRationale, decidedAt — dedicated queue; political claims always land here regardless of AI confidence; all checks performed manually by the reviewer for now

**AuditLog** — id, entityType, entityId, action, actorId, timestamp, details (JSON) — written for all political-category campaign creation, funding, review decisions, and payouts, regardless of how much of the underlying check is manual vs automated

**Campaign** — id, brandId, complianceTier, title, brief, platforms[], campaignType (standard/seeding/streaming), seedingSubtype (nullable: review_product/promo_wearable), streamingSubtype (nullable: sponsored_segment/ambient_display), eligibilityCriteria (nullable JSON: minAvgViewers, minStreamHours30d, platformVerifiedRequired, niche — streaming campaigns only), contentTypes[] (see Section 4 taxonomy), qualificationType (brand_material/positive_mention), requiresDisclosureLabel (bool), brandAssets[] (images/video/audio/banner graphics), payoutLadder (JSON), budgetCap, targetPeriodDays, maxCreators, budgetSpent, currency (NGN/USD), status, startDate, endDate

**CampaignClaim** — id, campaignId, creatorId, trackedLink/hashtag, claimedAt, status (active/submitted/qualifying/qualified/disqualified/under_review/paid/rejected/no_show)

**SubmissionEvent** — claimId, submittedUrl, submittedAt, screenshotUrl (nullable, required for ephemeral content), existenceVerified (bool), withinCampaignWindow (bool), trackedIdentifierPresent (bool), accountOwnershipVerified (bool), status (accepted/rejected_mismatch/rejected_ownership/rejected_timing) — created when the creator submits their post link; must pass before the claim proceeds to AI qualification (Section 9.1)

**ProductInventory** — campaignId, productName, variant (size/color, nullable), unitsAvailable, unitsClaimed, unitValue, shippingCostEstimate

**SeedingClaim** — extends CampaignClaim: shippingAddressId, courierProvider, trackingRef, deliveredConfirmedAt, contentDeadline

**StreamingClaim** — extends CampaignClaim: scheduledSegmentTime (nullable), vodUrl, verificationMethod (live_api/vod_review), eligibilityCheckResult (JSON, evaluated at claim time against the campaign's eligibilityCriteria)

**ShippingAddress** — creatorId, addressText, pickupPointId (nullable), verifiedViaCourierAPI (bool)

**QualificationResult** — claimId, method (asset_match/audio_fingerprint/vision/transcript_sentiment/disclosure_check/text_nlp), confidence, decision (pass/fail/needs_review), reviewedBy (ai/human), timestamp

**Metric** — claimId, platform, metricType (views/clicks/sales/concurrentViewers/peakViewers/watchTimeMinutes/newFollowers/chatEngagement), value, verificationMethod (api/manual/audited), capturedAt

**Payout** — claimId, amount, currency, payoutMethod (NGN bank via CreatorBankAccount / stablecoin), holdReleaseDate, status (held/released/clawed_back/on_hold_name_mismatch)

**CreatorBankAccount** — creatorId, accountNumber, bankCode, resolvedAccountName (via PSP account-resolution API), nameMatchVerified (bool, checked against BVN/NIN-verified identity name), verifiedAt

**CampaignFunding** — campaignId, depositedAmount, platformCommissionRate, platformCommissionAmount, netBudgetAvailable, currency, fundedAt, pspReference, refundedAmount (nullable), refundedAt (nullable)

**LedgerEntry** — id, entryType (deposit/commission_revenue/payout/refund/psp_fee_cost), amount, currency, campaignId (nullable), claimId (nullable), payoutId (nullable), timestamp, pspReference

**TrustEvent** — userId, eventType (campaign_completed/fraud_flag/kyc_verified/audit_pass/seeding_no_show), timestamp, scoreImpact

---

## 11. Core User Flows

1. **Brand**: sign up → verify business/agency → create campaign (category, content type(s)/streaming subtype, qualification type, payout ladder, budget cap/period/creator cap, eligibility criteria if streaming) → fund campaign (Paystack/Flutterwave) → campaign goes live
2. **Creator**: sign up → verify identity (BVN/NIN) → reach Tier 1 → browse open campaigns → claim (streaming claims checked against eligibility criteria automatically) → (if seeding) receive product/merch and confirm delivery → post content or complete stream segment → **submit the post/VOD link back into the platform** (Section 3.6) → system verifies existence, timing, and attribution → if passed, AI qualification check runs (method depends on content type, Section 4, or streaming subtype, Section 6.4) → if passed, metrics tracked → threshold cleared → payout released per tier rules (subject to budget pacing engine)
3. **Admin**: review AI "needs review" queue (qualification + fraud flags), approve/reject disputed claims, manage trust tier overrides, handle all political/electoral category review and Personal/Individual sensitive-content review

---

## 12. Full Build Scope

The underlying model is already validated by Grin, Whop, Upfluence, Verifluence, and the other platforms referenced throughout this document — this isn't an unproven concept that needs a cautious, staged rollout to de-risk product-market fit. The build below is the full system, not a trimmed-down version held back by phasing. The only sequencing that remains is **genuine technical dependency** — a handful of items literally cannot be built until a prior decision is made (e.g., you can't wire up audio fingerprinting before picking a provider) — not caution about the model itself.

**Core platform**
- All four campaign categories live from launch: Commercial, Personal/Individual, Government (public-service), and Political/Electoral, each with the full guardrail set specified in Section 7 — political with admin/human verification (7.4), Personal with mandatory identity verification and sensitive-content human review (7.2)
- Full campaign mechanics: budget cap, target-period pacing, and creator cap all available as constraints, reconciled by the Budget Pacing Engine (Section 9.2)
- Open, non-exclusive campaign claim flow across all categories, including eligibility-gated streaming claims (Section 6.1)
- Full Trust Tier system (0-3) with progression, payout-cap scaling, and hold-period scaling by tier
- Full content-type taxonomy from Section 4, including carousel/multi-slide and Story/ephemeral verification flows
- Streaming campaigns (Section 6) for live streamers, including upcoming streamers, with eligibility criteria, sponsored-segment and ambient-display qualification subtypes, and the streaming-specific metric set

**AI & verification systems**
- Asset/template matching for banners, cards, overlays, and discount codes
- Audio fingerprinting for branded sound usage
- Computer vision for brand/logo/product display and promo-wearable detection
- Transcript + LLM sentiment/stance classification for video ads, mentions, voice notes, text conversation starters, and streaming sponsored segments
- Automated fraud/anomaly detection on view/engagement patterns, cross-referenced against trust tier and creator history
- Creator-campaign matching, recommending relevant open campaigns by niche, language, and performance history, including eligibility-aware matching for streamers

**Payments & logistics**
- Full Paystack/Flutterwave integration for collection and payout, including the stablecoin payout option alongside NGN bank transfer
- Multiple courier integrations (Sendbox, GIGL, Kwik) for product/merch seeding, not limited to a single provider
- Affiliate/conversion-based payout tier tied to verified click/sale tracking
- Twitch and YouTube Live API integration for streaming metric verification; TikTok LIVE and Facebook Gaming via VOD-based review

**Compliance & trust infrastructure**
- Diaspora/global brand funding tooling (multi-currency campaigns) for Commercial — structurally excluded from Political/Electoral per Section 7.4
- Creator portable trust score, carried across platforms rather than siloed per brand
- USSD-based notifications/verification for low-connectivity users
- Open banking integration (per CBN's rollout) for richer identity/income verification

**Items with a genuine technical dependency, not a caution-based delay**
- Election blackout enforcement and political-category funding-source checks move from the manual admin checklist (Section 7.4) to automated enforcement once the courier/payment provider integrations and the maintained election-calendar data source are in place — this is a sequencing fact (the automation needs something to plug into), not a deferred feature
- Stablecoin payout activates once Paystack/Flutterwave's stablecoin settlement rails are confirmed integrated, since the platform is building on their infrastructure rather than its own
- Computer-vision and audio-fingerprinting verification activate once the specific provider/library is selected (Section 13 open decisions) — the mechanic is in scope now, the vendor choice is the only thing pending
- Streaming API integrations activate once Twitch/YouTube Live developer access is granted — an external approval timeline, not a self-imposed delay

---

## 13. Open Decisions Before Build

- [ ] Tech stack (suggest: Node/TypeScript backend + Postgres, React/Next.js frontend)
- [ ] Which KYC/identity verification provider to partner with for BVN/NIN checks
- [ ] Which LLM/model to use for qualification sentiment classification (Claude API is a strong default given existing build context)
- [ ] Which audio-fingerprinting service/library to use for branded sound verification
- [ ] Tie-break rule for budget/creator-cap pacing when simultaneous claims exceed remaining capacity
- [ ] Confidence threshold for AI qualification auto-pass vs routing to human review (commercial/government only — political always routes to human review)
- [ ] Initial payout ladder defaults (need real campaign budget data to calibrate)
- [ ] Whether Lensmint or a licensed partner holds escrowed campaign funds
- [ ] Target launch platforms — full scope covers Instagram, TikTok, Facebook, Snapchat, and X for short-form, plus Twitch, YouTube Live, TikTok LIVE, and Facebook Gaming for streaming; the only genuine sequencing constraint is external platform API access (e.g., Meta app review timelines, Twitch/YouTube Live developer approval), not a self-imposed limitation
- [ ] First courier integration for seeding (recommend: Sendbox)
- [ ] Legal counsel review of the Political/Electoral manual verification checklist against ARCON, Electoral Act 2026, and NDPA before onboarding real political actors
- [ ] Staffing/process for the dedicated political review queue (who reviews, expected turnaround time, how election dates are sourced for the manual check)
- [ ] Definition/training criteria for what qualifies as "sensitive content" in the Personal/Individual tier (medical/fundraising claims, third-party-named content) and how reviewers should evaluate plausibility of fundraising claims without becoming a full fact-checking operation
- [ ] Process for detecting when a "Personal" campaign is substantively political and needs redirecting to the Political/Electoral review path (Section 7.2)
- [ ] Default eligibility criteria templates for streaming campaigns (what counts as a reasonable minimum-viewer bar that doesn't accidentally recreate follower-count gatekeeping)
- [ ] How strictly to verify account ownership at submission time (Section 3.6) — full OAuth-based ownership check at sign-up vs. lighter pattern-matching (does the submitted account match the verified handle on file) — affects both fraud resistance and onboarding friction
- [ ] Exact platform commission rate (10-15% suggested in Section 8.4) — needs real cost modeling against PSP fees, KYC verification costs, AI compute, and admin staffing before finalizing
- [ ] Whether the commission is shown to brands as a separate line item at campaign funding or bundled into a single "total campaign cost" figure
- [ ] Admin process and turnaround expectation for resolving bank-account name mismatches (Section 8.4) before a held payout can be released
- [ ] Validate the illustrative unit-economics assumptions in Section 8.4 (average campaign budget, claims per campaign, review rate) against real data once campaigns are live, and re-confirm the commission rate against actual fixed-cost coverage at observed volume
