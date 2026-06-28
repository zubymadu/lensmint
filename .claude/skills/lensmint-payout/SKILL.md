---
name: lensmint-payout
description: Use whenever implementing the payout ladder, budget pacing engine, creator caps, seeding payout structures, or streaming payout structures. Trigger on code touching CampaignFunding allocation, payoutLadder evaluation, budget/creator-cap reconciliation, or any "how much does this creator earn" calculation.
---

# Lensmint Payout & Budget Logic

Full detail in `docs/lensmint-product-scope.md`, Sections 3.3, 3.4, 5.4, 6.5, and 9.2. This skill governs how much creators earn and how brand budgets get allocated across simultaneous claims.

## Core principle
Payout amount is determined by the **payout ladder evaluated against verified metrics**, after qualification passes. Never let a brand's stated budget cap silently reduce what an individual creator was promised mid-campaign — budget constraints affect whether *new* claims can be accepted, not what's already been earned.

## Standard payout ladder (short-form content)
Non-linear scaling, not flat-per-post:
- Below minimum threshold → $0
- Minimum threshold (e.g. 5K views) → base rate per 1K views
- Mid tier (e.g. 50K+ views) → multiplier bonus
- Viral tier (e.g. 500K+ views) → higher multiplier
- Optional conversion bonus → extra payout per verified click/sale

Thresholds/multipliers are campaign-configurable. Don't hardcode a single global ladder.

## Budget constraints — three independent levers
A campaign can set any combination of:
- `budgetCap` — total spend ceiling
- `targetPeriodDays` — paces spend across a window rather than allowing one early viral hit to exhaust it instantly
- `maxCreators` — caps claim count independent of budget

When multiple are set, the Budget Pacing Engine reconciles them. **The tie-break rule for simultaneous threshold-clears exceeding remaining budget is an explicit open decision in the scope doc — do not silently pick first-come-first-served without flagging it.** Default to first-verified-basis only if no other rule has been specified, and make this configurable.

## Seeding payout (product/merch campaigns)
Three models, brand-selectable per campaign:
- Gifted-only: product is full compensation, no cash
- Gifted + performance bonus: product is base, cash bonus above a view/engagement threshold (default)
- Gifted + flat completion fee: product + fixed cash on qualifying submission, no ladder

Seeding claims are **capped by `unitsAvailable`**, not open-ended — never let claims exceed inventory.

## Streaming payout
Different metric set than short-form (concurrent viewers, watch-time, new followers — not view counts). Three models:
- Flat per-stream segment fee (best for upcoming streamers — no performance risk)
- Viewer-threshold bonus (base + scaling bonus)
- Ambassador retainer (recurring, for established Tier 2/3 streamers)

Chat engagement volume is directional only — never use it as a primary payout metric, it's too easily manipulated.

## Trust tier interaction
Payout caps and hold-release timing scale with `trustTier` (Section 3.5) — this is a multiplier/ceiling on top of the ladder result, not a separate calculation. A Tier 1 creator and a Tier 3 creator hitting the same metrics get the same ladder payout, but different caps and different release timing.
