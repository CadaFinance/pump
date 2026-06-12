#!/usr/bin/env bash
# Verify BSC Testnet pump contracts on BscScan.
#
# Setup (Git Bash / WSL / Linux / macOS):
#   cd tma/contracts
#   cp .env.verify.example .env.verify
#   # edit .env.verify → set BSCSCAN_API_KEY
#   source .env.verify
#   bash script/verify-bsc-testnet.sh
#
# Or one-liner:
#   export BSCSCAN_API_KEY=... && source .env.verify.example && bash script/verify-bsc-testnet.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${BSCSCAN_API_KEY:-}" ]]; then
  echo "ERROR: export BSCSCAN_API_KEY first (see .env.verify.example)" >&2
  exit 1
fi

: "${OWNER:?export OWNER}"
: "${DEPLOYER:?export DEPLOYER}"
: "${TREASURY:?export TREASURY}"
: "${BONDING:?export BONDING}"
: "${FACTORY:?export FACTORY}"
: "${LENS:?export LENS}"
: "${MEME_IMPL:?export MEME_IMPL}"
: "${CHAIN_ID:=97}"

COMMON=(--chain-id "$CHAIN_ID" --etherscan-api-key "$BSCSCAN_API_KEY" --watch)

echo "==> LaunchpadTreasury $TREASURY"
forge verify-contract "$TREASURY" \
  src/LaunchpadTreasury.sol:LaunchpadTreasury \
  "${COMMON[@]}" \
  --constructor-args "$(cast abi-encode "constructor(address)" "$OWNER")"

echo "==> BondingCurveManager $BONDING"
forge verify-contract "$BONDING" \
  src/BondingCurveManager.sol:BondingCurveManager \
  "${COMMON[@]}" \
  --constructor-args "$(cast abi-encode "constructor(address,address)" "$DEPLOYER" "$TREASURY")"

echo "==> MemeFactory $FACTORY"
forge verify-contract "$FACTORY" \
  src/MemeFactory.sol:MemeFactory \
  "${COMMON[@]}" \
  --constructor-args "$(cast abi-encode "constructor(address,address,address)" "$DEPLOYER" "$TREASURY" "$BONDING")"

echo "==> LaunchpadLens $LENS"
forge verify-contract "$LENS" \
  src/LaunchpadLens.sol:LaunchpadLens \
  "${COMMON[@]}" \
  --constructor-args "$(cast abi-encode "constructor(address)" "$BONDING")"

echo "==> MemeTokenImplementation $MEME_IMPL (no constructor args)"
forge verify-contract "$MEME_IMPL" \
  src/MemeTokenImplementation.sol:MemeTokenImplementation \
  "${COMMON[@]}"

echo "All verify jobs submitted."
