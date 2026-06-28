---
name: lensmint-web
description: Use when building or modifying the Lensmint responsive website — brand dashboards, creator dashboards, public campaign browsing, admin panels. Trigger on any frontend work in the web app, especially layout, data-cost considerations, and Nigeria-specific UX patterns.
---

# Lensmint Web App Conventions

Companion to `docs/lensmint-product-scope.md`, Section 8.3. Covers the responsive website surface (distinct from the mobile app — see lensmint-mobile).

## Stack assumption
React/Next.js frontend, talking to the Node/TypeScript backend. Use this unless a different stack has been explicitly chosen in the repo already — check for an existing `package.json`/framework before scaffolding a new one.

## Mobile-first, data-cost-conscious by default
Nigeria's creator base is primarily mobile, often on metered/expensive data. This is not a "nice to have" responsive breakpoint — it's the primary design constraint:
- Design and build for the smallest viewport first, scale up — not the reverse
- No forced video/image autoplay anywhere in the creator-facing experience
- Compressed image/video previews by default; full-resolution only on explicit user action
- Keep initial bundle size and first-load data transfer lean — this audience pays per megabyte in practice even if not literally metered

## Three distinct user surfaces, don't conflate them
- **Brand dashboard**: campaign creation (with category/tier-aware forms — see lensmint-compliance for which fields apply to which complianceTier), funding, performance view, claim approval where applicable
- **Creator dashboard**: browse open campaigns (filterable by eligibility for streaming, niche, platform), claim, submit post link (see lensmint-qualification for the submission flow this UI must support), track payout status
- **Admin panel**: qualification "needs review" queue, political/personal sensitive-content review queues (see lensmint-compliance), trust tier overrides, ledger/audit log viewer

Each of these has different information density needs and different user sophistication assumptions — don't build one generic "campaign view" component and try to make it serve all three roles via prop flags. Build role-appropriate views.

## Language/niche tagging in the UI
Surface niche and language tags (Pidgin, Yoruba, Igbo, Hausa, etc.) as real filterable/searchable fields in campaign browse and creator profile UI, not just backend metadata — this is part of how creators find campaigns that fit them and how brands find relevant creators.

## Disclosure labels are UI-visible, not just a backend flag
Wherever `requiresDisclosureLabel` is true, the creator-facing submission flow should visibly prompt for and validate the disclosure label before allowing submission — don't make this purely a backend qualification check that surprises the creator after the fact.
