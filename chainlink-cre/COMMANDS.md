# CRE CLI Commands Guide

## Prerequisites

### Install CRE CLI

```bash
# Download binary (macOS ARM64)
curl -sL https://github.com/smartcontractkit/cre-cli/releases/latest/download/cre_darwin_arm64.zip -o /tmp/cre.zip
unzip /tmp/cre.zip -d ~/bin/
chmod +x ~/bin/cre
export PATH="$HOME/bin:$PATH"
```

### Login

```bash
cre login        # Opens browser for auth
cre whoami       # Verify your account
```

### Setup .env

```bash
# In chainlink-cre/.env
CRE_ETH_PRIVATE_KEY=<your_private_key_funded_on_worldchain>
UNISWAP_API_KEY=<your_uniswap_api_key>
```

The private key must have ETH on World Chain mainnet to pay for gas during simulation with `--broadcast`.

## Development workflow

### 1. Install dependencies

```bash
cd my-workflow
npm install
```

### 2. Type-check

```bash
npm run typecheck
```

### 3. Run tests

```bash
bun test
```

### 4. Simulate (dry run)

```bash
cre workflow simulate my-workflow -T staging-settings
```

### 5. Simulate with broadcast (writes onchain via MockForwarder)

```bash
cre workflow simulate my-workflow -T staging-settings --broadcast
```

### 6. Watch `SettlementRequest` and auto-run CRE simulation

```bash
cd my-workflow
npm run watch:settlement
```

By default the watcher:

- listens to `SettlementRequest` on the contract from `config.staging.json`
- reads the RPC URL from `../project.yaml` for `staging-settings`
- runs `cre workflow simulate my-workflow -T staging-settings --broadcast --non-interactive`
- maps the detected log to CRE's transaction-relative `evm-event-index`

If you really want to force the event index to `0`:

```bash
cd my-workflow
node ./watch-settlement-request.mjs --fixed-event-index 0
```

## Testing data sources manually

### Hyperliquid — Crypto perps

```bash
curl -s -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "allMids"}' | python3 -m json.tool | head -20
```

### Hyperliquid — TradFi (dex xyz)

```bash
curl -s -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "allMids", "dex": "xyz"}' | python3 -m json.tool
```

### Hyperliquid — Spot token metadata

```bash
curl -s -X POST https://api.hyperliquid.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "spotMeta"}' | python3 -c "
import json, sys
d = json.load(sys.stdin)
for u in d['universe'][:20]:
    base = d['tokens'][u['tokens'][0]]['name']
    print(f'  @{u[\"index\"]} -> {base} (canonical={u[\"isCanonical\"]})')
"
```

### Uniswap — ERC-20 quote (Base example)

```bash
curl -s -X POST "https://trade-api.gateway.uniswap.org/v1/quote" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "type": "EXACT_INPUT",
    "amount": "1000000000000000000",
    "tokenIn": "0xc0634090F2Fe6c6d75e61Be2b949464aBB498973",
    "tokenOut": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "tokenInChainId": 8453,
    "tokenOutChainId": 8453,
    "swapper": "0x0000000000000000000000000000000000000001"
  }' | python3 -m json.tool
```

### Jupiter — Solana quote (sell direction)

```bash
curl -s "https://lite-api.jup.ag/swap/v1/quote?inputMint=Dfh5DzRgSvvCFDoYc2ciTkMrbDfRKybA4SoFbPmApump&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50" | python3 -m json.tool
```

### Solana — Get token decimals

```bash
curl -s https://api.mainnet-beta.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["Dfh5DzRgSvvCFDoYc2ciTkMrbDfRKybA4SoFbPmApump",{"encoding":"jsonParsed"}]}' \
  | python3 -c "import json,sys; print(f'decimals: {json.load(sys.stdin)[\"result\"][\"value\"][\"data\"][\"parsed\"][\"info\"][\"decimals\"]}')"
```

## Useful CRE commands

```bash
cre --help                          # All available commands
cre workflow --help                 # Workflow subcommands
cre workflow simulate --help        # Simulation options
cre account --help                  # Account management
cre secrets --help                  # Secrets management
cre generate-bindings --help        # Generate TS bindings from ABI
cre update                          # Update CLI to latest version
```

## Common issues

| Problem | Solution |
|---------|----------|
| `Network not found` | Check `chainSelectorName` matches a supported CRE chain |
| `No price for "X"` | Verify the asset exists on the target provider (check with curl) |
| `writeReport failed` | Ensure contract is deployed and forwarder is set correctly |
| `authentication required` | Run `cre login` |
| Simulation hangs | Check `.env` has a funded private key |
| `Uniswap API HTTP 401` | Check `uniswapApiKey` in config |
| `Jupiter HTTP 401` | Use `lite-api.jup.ag` not `api.jup.ag` |
