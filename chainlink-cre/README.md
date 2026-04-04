# Chainlink CRE Workflow — WorldInPaper Price Oracle

Custom oracle that fetches real swap quotes from multiple chains/providers and pushes the USD price onchain to settle trades in the WorldInPaper paper trading game.

## How it works

```
WIP Contract emits SettlementRequest(tradeId, gameId, assetId, origin, isBuy, amount)
    |
CRE Workflow (EVM Log Trigger) picks up the event
    |
Based on origin (= chain), routes to the right provider:
  0 Solana     → Jupiter lite-api quote (auto-detects token decimals via RPC)
  1 Base       → Uniswap Trading API quote (chainId 8453)
  2 Ethereum   → Uniswap Trading API quote (chainId 1)
  3 BSC        → Uniswap Trading API quote (chainId 56)
  4 World      → Uniswap Trading API quote (chainId 480)
  5 Hyperliquid → allMids mid price (perps + spot + tradfi)
    |
DON consensus (median aggregation across nodes)
    |
writeReport(tradeId, price) → KeystoneForwarder → onReport() on WIP Contract
    |
Contract settles the trade with the verified USD price
```

## Origin enum (must match contract)

```solidity
enum Origin { Solana, Base, Ethereum, Bsc, World, Hyperliquid }
```

| Origin | Chain | Provider | Quote type | Decimals |
|--------|-------|----------|-----------|----------|
| 0 | Solana | Jupiter lite-api | Real swap quote | Auto via Solana RPC |
| 1 | Base | Uniswap API | Real swap quote | Auto from API response |
| 2 | Ethereum | Uniswap API | Real swap quote | Auto from API response |
| 3 | BSC | Uniswap API | Real swap quote | Auto from API response |
| 4 | World | Uniswap API | Real swap quote | Auto from API response |
| 5 | Hyperliquid | Hyperliquid API | Mid price | N/A |

All quotes return **USD price per 1 token** with price impact baked in (except Hyperliquid which is mid price).

## Event interface

```solidity
event SettlementRequest(
    uint256 indexed tradeId,
    uint256 indexed gameId,
    string assetId,      // token address, symbol, or @index ("BTC", "@12", "0xc063...", "Dfh5Dz...")
    uint8 origin,        // enum Origin
    bool isBuy,          // true = buy, false = sell
    uint256 amount       // buy: USDC amount (6 dec), sell: token amount (token dec)
);
```

## Report format

```solidity
function _processReport(bytes calldata report) internal override {
    (uint256 tradeId, uint256 executionPrice) = abi.decode(report, (uint256, uint256));
    // executionPrice = USD per 1 token, scaled to 18 decimals (1e18)
    // Example: ETH at $2060.45 → executionPrice = 2060450000000000000000
}
```

## Hyperliquid asset IDs

For origin=5 (Hyperliquid), the assetId is looked up directly in allMids:

- Crypto perps: `"BTC"`, `"ETH"`, `"SOL"` (direct name)
- Spot tokens: `"@12"` for PEPE, `"@10"` for TRUMP (frontend resolves name → @index via spotMeta)
- TradFi: `"xyz:AAPL"`, `"xyz:GOLD"` or just `"AAPL"` (auto-prefixed)

## Network

- **Chain**: World Chain mainnet (chain ID 480)
- **CRE chain selector**: `ethereum-mainnet-worldchain-1`
- **MockForwarder** (simulation): `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`
- **KeystoneForwarder** (prod): `0x98B8335d29Aca40840Ed8426dA1A0aAa8677d8D1`

## Config

```json
{
  "contractAddress": "0x...",
  "chainSelectorName": "ethereum-mainnet-worldchain-1",
  "gasLimit": "500000"
}
```

Uniswap API key is read from CRE secrets (`UNISWAP_API_KEY`).

## .env

```bash
CRE_ETH_PRIVATE_KEY=<your_private_key_funded_on_worldchain>
UNISWAP_API_KEY=<your_uniswap_api_key>
```

## CRE limits

| Limit | Value |
|-------|-------|
| HTTP response size | 100 KB max |
| HTTP request size | 10 KB max |
| HTTP calls per execution | 5 max |
| Connection timeout | 10 seconds |
| Total workflow timeout | 5 minutes |
