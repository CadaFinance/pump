#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$ROOT/skandha.config.json"

if [[ -z "${BUNDLER_RELAYER_PRIVATE_KEY:-}" ]]; then
  echo "Set BUNDLER_RELAYER_PRIVATE_KEY (0x… funded with BNB on BSC testnet)."
  exit 1
fi

RPC="${BSC_RPC_URL:-https://bsc-testnet-rpc.publicnode.com}"

python3 - <<PY
import json
from pathlib import Path

path = Path("$CONFIG")
data = json.loads(path.read_text())
data["relayers"] = ["${BUNDLER_RELAYER_PRIVATE_KEY}"]
data["rpcEndpoint"] = "${RPC}"
path.write_text(json.dumps(data, indent=2) + "\n")
print("Updated", path)
PY

cd "$ROOT"
docker compose up -d
echo "Skandha listening on http://127.0.0.1:14337/rpc"
echo "Set BUNDLER_RPC_URL=http://127.0.0.1:14337/rpc in pump-tma .env"
