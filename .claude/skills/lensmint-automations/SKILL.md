---
name: lensmint-automations
description: Use when implementing any background job, scheduled task, webhook handler, or worker process for Lensmint. Trigger on queue/worker setup, cron-style scheduled logic, or any "this needs to run without a user request triggering it" requirement.
---

# Lensmint Background Automations

This skill is the canonical list of background processes the system needs. If you're building a new automated job and it's not on this list, check whether it should be — and if it's genuinely new, it likely belongs added to `docs/lensmint-product-scope.md` first.

## Stack recommendation
A queue-based worker pattern (e.g. BullMQ on Redis, or a Postgres-backed job table with polling if avoiding an extra infra dependency) over ad-hoc cron scripts. Given this system moves real money, every job must be **idempotent and retry-safe** — a job that runs twice (e.g. due to a retry after a transient failure) must never double-pay a creator or double-write a ledger entry. Use idempotency keys tied to the entity being processed (claimId, campaignId) wherever a job touches `Payout` or `LedgerEntry`.

## Required jobs, by domain

**Submission verification** (Section 3.6)
- Fetch and verify submitted post/VOD links: existence, timing, attribution checks, before handing off to qualification AI. Run on submission, not on a delay — but the underlying URL fetch should be retried with backoff if the platform is briefly unreachable.

**Qualification processing** (Section 9.1)
- Async AI qualification pipeline (vision/audio/transcript/disclosure checks) — don't run this synchronously in the request path; queue it and notify the creator on completion.
- Route low-confidence and category-mandated results (political, personal-sensitive) to the appropriate human review queue.

**Payout & budget** (Sections 8.2, 8.4)
- Hold-release job: check `holdReleaseDate` against trust tier rules, release eligible payouts via PSP.
- Budget pacing recalculation: reconcile `budgetCap`/`targetPeriodDays`/`maxCreators` against in-flight claims; apply the tie-break rule for simultaneous threshold-clears.
- Campaign close job: detect budget exhaustion, creator-cap reached, or duration elapsed; trigger refund of unspent `netBudgetAvailable`.
- Name-mismatch resolution reminder: surface aging `on_hold_name_mismatch` payouts to the admin queue rather than letting them sit silently.

**Logistics** (Section 5.3)
- Courier webhook handler: process delivery-status updates from Sendbox/GIGL/Kwik; on `delivered_confirmed`, auto-open the content submission window.
- Fallback polling for any courier without reliable webhooks, to avoid claims stalling indefinitely on a missed event.

**Streaming** (Section 6.4)
- Twitch/YouTube Live webhook or polling for stream start/end and VOD-ready events.
- Eligibility re-check job if a campaign's criteria depend on rolling stats (e.g. `verifiedStreamHours30d`) that change over time, not just at claim time.

**Fraud & trust** (Sections 3.5, 9.3)
- Anomaly detection batch job on view/engagement velocity, cross-referenced against trust tier and history; flags route to review, never auto-reject.
- Trust tier recalculation: promote/demote based on completed campaigns, fraud flags, and audit outcomes.

**Compliance** (Section 7.4 — currently manual, but build the scaffolding)
- Election blackout window check: even while admin-checklist-enforced, a scheduled job that surfaces upcoming blackout windows to admins ahead of time reduces the chance of a manual miss. This is the natural first automation candidate when the project moves from manual checklist to automated enforcement.

**Financial hygiene** (Section 8.4)
- Ledger reconciliation: periodically reconcile PSP settlement records against internal `LedgerEntry` rows; flag discrepancies rather than silently trusting either source.

## What NOT to automate yet
Per the scope doc, political-category funding-source verification and election-blackout *enforcement* (as opposed to surfacing/reminding) remain admin-checklist-driven until the supporting integrations and a maintained election calendar exist. Don't silently automate past that boundary — it's a deliberate compliance decision, not an oversight.
