# Airdrop product gap analysis (2026-06-18)

## Differentiator

Pump airdrops lock **100% of the reward pool** in `PumpAirdropManager` at campaign creation. Creators cannot withdraw during qualify. Winners claim via Merkle proofs after TOP 100 ranking.

## Gaps closed in this pass

| Area | Before | After |
|------|--------|-------|
| List hub | Generic “Escrow on-chain” | Guarantee explainer, funded-pool badge, high-value filter label |
| Detail | No trust surface | `AirdropTrustPanel` — escrow amount, contract links, guarantee bullets |
| Token page | No campaign discovery | `AirdropCampaignStrip` via `/api/airdrops/by-token/[address]` |
| Create flow | Weak escrow copy | Guarantee explainer + on-chain funding narrative |
| Portfolio | Hidden when empty | CTA to browse / create campaigns |
| Arena | No airdrop signal on coins | “Airdrop” chip on linked tokens |

## Remaining Tier-4 UX (not in this pass)

- Push / email claim reminders
- Creator analytics dashboard
- Social proof (total claimed, participant count on list cards)
- i18n for guarantee copy

## API

- `GET /api/airdrops/by-token/[address]` — active campaign for a linked launchpad token (`getActiveAirdropForLinkedToken`).
