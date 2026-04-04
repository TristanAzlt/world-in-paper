#!/usr/bin/env bash
set -euo pipefail

# Optional: load local env vars if .env exists.
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

ANVIL_FORK_URL="${ANVIL_FORK_URL:-${RPC_URL:-}}"
LOCAL_RPC_URL="${LOCAL_RPC_URL:-http://localhost:8550}"
ANVIL_PORT="${ANVIL_PORT:-8550}"
ANVIL_HOST="${ANVIL_HOST:-0.0.0.0}"
ANVIL_CHAIN_ID="${ANVIL_CHAIN_ID:-480}"
TIME_INCREASE_SECONDS="${TIME_INCREASE_SECONDS:-300}"

if [[ -z "${ANVIL_FORK_URL}" ]]; then
  echo "Missing ANVIL_FORK_URL (or RPC_URL) in environment."
  exit 1
fi

cleanup() {
  if [[ -n "${ANVIL_PID:-}" ]] && kill -0 "${ANVIL_PID}" 2>/dev/null; then
    kill "${ANVIL_PID}" || true
  fi
}
trap cleanup EXIT

echo "[1/6] Starting anvil fork on ${LOCAL_RPC_URL}..."
anvil \
  --fork-url "${ANVIL_FORK_URL}" \
  --port "${ANVIL_PORT}" \
  --host "${ANVIL_HOST}" \
  --chain-id "${ANVIL_CHAIN_ID}" \
  > /tmp/anvil-fork-flow.log 2>&1 &
ANVIL_PID=$!

for _ in {1..30}; do
  if cast block-number --rpc-url "${LOCAL_RPC_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cast block-number --rpc-url "${LOCAL_RPC_URL}" >/dev/null

echo "[2/6] Deploying WorldInPaper..."
forge script script/WorldInPaper.s.sol:WorldInPaperScript \
  --fork-url "${LOCAL_RPC_URL}" --via-ir -vv --broadcast

echo "[3/6] Creating + joining game..."
forge script script/Game.s.sol:GameScript \
  --fork-url "${LOCAL_RPC_URL}" --via-ir -vv --broadcast

echo "[4/6] Advancing time by ${TIME_INCREASE_SECONDS}s..."
cast rpc --rpc-url "${LOCAL_RPC_URL}" evm_increaseTime "${TIME_INCREASE_SECONDS}" >/dev/null
cast rpc --rpc-url "${LOCAL_RPC_URL}" evm_mine >/dev/null

echo "[5/6] Submitting trade..."
forge script script/Trade.s.sol:TradeScript \
  --fork-url "${LOCAL_RPC_URL}" --via-ir -vv --broadcast

echo "[6/6] Done."
echo "Anvil log: /tmp/anvil-fork-flow.log"
