# World In Paper — Smart Contracts

Solidity contracts deployed on World Chain mainnet (chain ID 480).

## Contracts

- **WorldInPaper** — game creation, joining (with World ID), trading, CRE settlement, claiming
- **WorldInPaperObserver** — read-optimized views (ranking, portfolio, game lists)

## Build & Test

```bash
forge build
forge test
```

## Deploy

```bash
cp .env.example .env
# Fill in the values
forge script script/WorldInPaper.s.sol --rpc-url $RPC_URL --broadcast
```

## Key Mechanics

- **Buy-in** — players pay USDC to join, pooled in the contract
- **Paper trading** — virtual balances, real prices via Chainlink CRE
- **Settlement** — CRE fetches price, writes report via MockForwarder, contract settles trade
- **Payout** — top 50% gets 2x buy-in, middle player (odd) gets refund, bottom 50% gets nothing
- **World ID** — sybil protection per game (nullifier scoped by gameId)
