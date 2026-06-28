---
name: lensmint-financials
description: Use whenever implementing campaign funding/escrow, platform commission calculation, creator bank payouts, refunds, or the financial ledger. Trigger on Paystack/Moniepoint/OPay integration code, CampaignFunding, CreatorBankAccount, LedgerEntry, or Payout entities.
---

# Lensmint Financial Flow

Full detail in `docs/lensmint-product-scope.md`, Section 8.4. This skill governs real money movement — treat every rule here as a hard constraint, not a default to optimize away.

## PSP partners
Lensmint operates escrow through **three PSP partners**: Paystack, Moniepoint, and OPay. All three are supported for both collection (brand deposits) and payout (creator bank transfers). Every financial entity (`CampaignFunding`, `Payout`, `LedgerEntry`) must carry a `pspProvider` field (`paystack` | `moniepoint` | `opay`) so movements are traceable per provider. PSP fees differ across providers — absorb the difference as a platform cost rather than surfacing per-provider fee variation to brands or creators.

- **Paystack** — primary for card/bank-transfer collection; best API documentation
- **Moniepoint** — strong for SME brands who bank there; good business banking rails
- **OPay** — broad retail reach; good for creator payouts to lightly-banked users

## Revenue model
- Platform commission (10-15%, exact rate TBD — see open decisions) is charged to the **brand**, calculated and deducted **once, at funding time**. It is never deducted again at payout.
- Creators receive the **full ladder-calculated amount** — never skim platform commission from a creator payout. This is a product trust commitment, not just an accounting choice.
- PSP processing fees are a platform cost absorbed into the commission — never itemize them as a surprise separate charge to brand or creator.

## Escrow flow (implement in this order)
1. Brand funds campaign: deposit = `budgetCap + platformCommissionAmount`, via their chosen PSP partner.
2. Funds sit in escrow **through the licensed PSP partner** — Lensmint does not hold customer funds directly. Do not build a custom internal wallet that holds brand deposits outside the PSP's regulated rails.
3. `netBudgetAvailable` (deposit minus commission) is the only amount available for creator payouts. Commission is already recognized as revenue at step 1.
4. At campaign close (budget exhausted, creator cap reached, or duration elapsed), auto-refund any unspent `netBudgetAvailable` to the brand, minus any non-refundable PSP fee already incurred.

## Creator bank payout mechanics
1. Creator adds bank account (account number + bank code) at Tier 1 verification.
2. Resolve the account via the PSP's account-resolution API to get the bank's own record of the account holder's name.
3. Compare resolved name against the creator's platform-verified identity name (`nameMatchVerified`) — see lensmint-compliance for how Tier 1 identity is established.
4. **A mismatch does not auto-reject** — route to admin review (legitimate cases exist: maiden names, joint accounts) and hold the payout (`status: on_hold_name_mismatch`) until resolved. But never release payout to an unmatched account without explicit admin sign-off.
5. Payout to a verified, matched account proceeds via NIP rails — same-day/instant for Tier 2/3 creators per the trust-tier hold-release rules.

## Ledger discipline
Every financial movement gets a `LedgerEntry`: deposit, commission_revenue, payout, refund, psp_fee_cost. This is non-negotiable for Political/Government campaigns (audit requirement) and is standard practice everywhere else. Don't let any money move without a corresponding ledger write in the same transaction.

## Unit economics sanity check (for cost-aware implementation choices)
Per the doc's illustrative model, AI qualification compute is one of the *cheapest* line items (~₦75/campaign), well below admin review cost (~₦226) and the PSP deposit fee (~₦2,000, capped). Don't over-optimize AI compute costs at the expense of qualification accuracy — that's optimizing the wrong line item.
