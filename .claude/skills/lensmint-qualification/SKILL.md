---
name: lensmint-qualification
description: Use whenever implementing or modifying the content submission pipeline, AI qualification checks, content-type definitions, or the verification-method selection logic. Trigger on code touching SubmissionEvent, QualificationResult, content type taxonomy, vision/audio/transcript verification, or streaming qualification subtypes.
---

# Lensmint Content Qualification Pipeline

Full detail in `docs/lensmint-product-scope.md`, Sections 3.6, 4, 6.2, 6.4, and 9.1. This skill governs pipeline order and method selection — don't reorder these stages.

## Pipeline order (never skip or reorder)
1. **Submission** — creator submits the post/VOD link. No automatic discovery; the creator always provides the link.
2. **Attribution check** (`SubmissionEvent`) — before qualification AI ever touches the content, verify:
   - Existence: link is live and publicly accessible
   - Timing: posted after `claimedAt`, within the campaign's active window
   - Attribution: carries this claim's unique tracked link/hashtag, belongs to the creator's verified handle for that platform
   - For ephemeral content (Stories/Status): a timestamped screenshot/recording is mandatory since the link disappears in 24h
3. **Qualification AI** — only runs on submissions that passed step 2. Method depends on content type (table below).
4. **Metrics tracking** — only after qualification passes.

A mismatch at step 2 (wrong account, missing tracked identifier, outside window) rejects the submission immediately — do not invoke qualification AI on rejected submissions. Repeated mismatches from one creator should increment a fraud signal.

## Verification method by content type
| Content type | Method | Notes |
|---|---|---|
| Banner/card overlay (video or image), branded sound, discount code | Asset/audio match or exact-string match | Highest reliability — ship and trust these first |
| Brand/logo/product display, promo-wearable | Computer vision, min. visible-duration check | Medium reliability |
| Video ad, brand mention by actor, voice note, text conversation starter | Transcript + LLM sentiment/stance | Judgment-based, lower reliability, higher review rate |
| Skit/comedy with brand integration | Same as display/mention, but **lower default confidence threshold** | Sarcasm/exaggeration misclassifies easily — bias toward human review |
| Carousel/multi-image | Vision/asset-match across the *full* slide set | Don't only check slide 1 |
| Streaming `ambient_display` | Asset/template match, continuous on-screen duration across full stream | Same principle as banner/card, measured continuously |
| Streaming `sponsored_segment` | Transcript + sentiment on the segment, cross-checked against scheduled timestamp | |

**Explicitly out of scope:** brand-positive comment marketing on others' content. Don't build a qualification path for it — the fraud profile is too close to comment-spam to control reliably.

## Confidence routing
- Output is always one of: `pass`, `fail`, `needs_review`. Never force a binary call on a low-confidence result.
- Political/electoral content: **always** `needs_review`, regardless of AI confidence. No threshold bypasses this.
- Personal/Individual sensitive content (medical/fundraising claims, content naming real third parties): **always** `needs_review`.
- Disclosure check (commercial/government/political): missing disclosure label = automatic `fail`, runs before sentiment/vision checks.
- Failed qualification has an appeal path — creators can contest, which routes to human review. Don't make `fail` terminal without an appeal option.

## Streaming eligibility (claim-time, not qualification-time)
Eligibility criteria (`minAvgViewers`, `minStreamHours30d`, etc.) are checked **at claim time**, before a streamer can even claim — this is separate from qualification and happens earlier in the flow. A streamer failing one campaign's bar is still free to claim other campaigns with lower/no bar. Don't implement this as a platform-wide minimum; it's per-campaign.
