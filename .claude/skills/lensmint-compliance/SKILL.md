---
name: lensmint-compliance
description: Use whenever writing or reviewing code that creates, funds, approves, or reviews a Lensmint campaign, or that touches user/brand identity verification. Encodes the four campaign compliance tiers (Commercial, Personal/Individual, Government, Political/Electoral) and the Trust Tier system. Trigger on campaign creation endpoints, funding/escrow code, admin review queues, identity flows, and anything involving complianceTier or trustTier fields.
---

# Lensmint Compliance & Identity Rules

Full detail lives in `docs/lensmint-product-scope.md`, Sections 3.5, 6, and 7. This skill is the operational summary — consult the full doc for edge cases not covered here.

## Trust Tier gate (applies to every creator, every category)
- Tier 0 (unverified): browse only, cannot claim anything paid or seeded.
- Tier 1 (identity verified): can claim standard and seeding campaigns. Lower payout caps, longer payout hold.
- Tier 2 (track record, no fraud flags): higher caps, shorter hold, bigger/exclusive campaigns.
- Tier 3 (top creator): fastest/instant payout, guaranteed-floor deals eligible.
- **Never** let a Tier 0 user claim a campaign of any kind. Check `trustTier >= 1` before any claim-creation code path runs.
- A seeding no-show writes a `TrustEvent` weighted heavier than a missed cash-campaign threshold — implement the penalty differential, don't treat all negative events as equal.

## How Tier 1 is reached (no BVN/NIN required)
Tier 1 is granted when **both** of the following are confirmed:
1. **Phone number verified** — OTP confirmation to a Nigerian mobile number at sign-up.
2. **Bank account resolved and name-matched** — creator provides account number + bank code; the PSP account-resolution API returns the bank's own record of the account holder name. This resolved name becomes the creator's platform-verified identity name used for payout name-matching (see lensmint-financials). A successfully resolved account that returns a name is sufficient for Tier 1 — no separate BVN/NIN API call required.

This is intentionally lightweight. Additional verification methods (e.g. document upload, NIN slip, selfie) may be introduced later, especially for seeding claims on high-value products, but are not required at launch. The trust tier system and seeding no-show penalties are the primary fraud controls at Tier 1; the bank account name resolution is the identity anchor.

## Campaign compliance tier — pick the right gate, every time
Every `Campaign` has a `complianceTier`: `commercial`, `personal`, `government`, or `political`. Branch logic on this field; don't write one generic "create campaign" path and bolt tier checks on after.

| Tier | Identity gate | Funding source | AI auto-pass allowed? |
|---|---|---|---|
| commercial | Business verification (name, registration — manual or document upload) | Any verified source incl. diaspora/USD | Yes, per confidence threshold |
| personal | Phone + bank account resolved (same Tier 1 standard as creators), **before** campaign can go live | Individual's own verified bank account only, no third-party/pooled funding | No for sensitive content (medical/fundraising/third-party-named) — always human review |
| government | Verified government-agency account (admin-confirmed) | Traceable to sponsoring agency | Yes, same as commercial |
| political | Admin manually confirms registered-party/candidate status (INEC ref) before tier is granted | Nigerian-domiciled only — **reject at the funding API**, not just by policy | **Never** — every claim routes to human review, no exceptions, no confidence threshold |

## Hard rules, not suggestions
1. A campaign filed under `personal` whose content is substantively political (promotes a candidate/party) must redirect to the political review path. Don't let category self-declaration be the only check — run political-content detection regardless of declared tier.
2. Political-tier funding deposits must be rejected programmatically if the source account isn't Nigerian-domiciled. This is a payment-API-level check, not a UI warning.
3. No campaign content may target or name a private individual negatively. This is a hard reject, not a qualification-AI judgment call — route to admin and block publication.
4. Election blackout: check current admin-maintained blackout window before approving any political claim or content submission. (Currently manual-checklist enforced — see lensmint-automations skill for when this becomes a scheduled job.)
5. Equal treatment across political accounts is enforced by using identical code paths parameterized only by campaign data — never branch logic by which party/candidate is involved.

## When you're unsure
If a code change would let *any* category skip identity verification, skip human review on political/sensitive content, or accept non-Nigerian funding for a political campaign — stop and flag it rather than implementing a workaround. These are the highest-consequence rules in the whole system.
