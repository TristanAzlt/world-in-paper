# World In Paper

Competitive paper trading game built as a World App mini-app for ETHGlobal Cannes 2026.

Create a game, set a buy-in in USDC, invite friends, and trade crypto, stocks, and commodities with virtual capital. Top 50% doubles their entry.

## Try it

Scan with World App:

<p align="center">
  <img src="./app-QR-CODE.png" alt="Scan with World App" width="200" />
</p>

## How it works

1. **Create or join a game** with a USDC buy-in (secured by World ID)
2. **Trade any asset** — crypto (BTC, ETH, SOL...), stocks (AAPL, TSLA), commodities (GOLD), tokens on Base/Ethereum/Solana
3. **Chainlink CRE settles trades** — the oracle fetches real-time prices from Hyperliquid, Uniswap, and Jupiter, then writes the execution price onchain
4. **Top 50% wins 2x** their buy-in. Middle player (odd count) gets their buy-in back. Bottom 50% loses.

## Architecture

```
World App (MiniKit)
    |
    v
Mini App (Next.js) -----> Backend (Express) -----> Smart Contract (World Chain)
                                                         |
                                                    Chainlink CRE
                                                    (price oracle)
```

- **Mini App** — Next.js frontend inside World App via MiniKit SDK
- **Smart Contract** — Solidity on World Chain mainnet, handles games, trades, settlements, payouts
- **Chainlink CRE** — Custom oracle workflow that fetches prices and settles trades onchain
- **Backend** — Express API reading onchain state via the Observer contract

## Monorepo

```
/mini-app          → Next.js frontend (World App mini-app)
/smart-contract    → Solidity contracts (Foundry)
/backend           → Express API server
/chainlink-cre     → CRE workflow (TypeScript)
```

## Tech Stack

- **World Chain** mainnet (chain ID 480)
- **World App MiniKit** — walletAuth, sendTransaction, haptics, World ID
- **Chainlink CRE** — EVM Log Trigger, HTTPClient, DON consensus, writeReport
- **Uniswap V3** — token swaps on World Chain
- **Hyperliquid API** — real-time prices for crypto & tradfi
- **Uniswap API** — EVM token quotes (Base, Ethereum, BSC, World Chain)
- **Jupiter API** — Solana token quotes

## Price Sources

| Origin | Provider | Assets |
|--------|----------|--------|
| Hyperliquid | Hyperliquid API (allMids) | Crypto perps, stocks, indices, commodities |
| Base | Uniswap API | ERC-20 tokens on Base |
| Ethereum | Uniswap API | ERC-20 tokens on Ethereum |
| BSC | Uniswap API | BEP-20 tokens on BSC |
| World Chain | Uniswap API | Tokens on World Chain |
| Solana | Jupiter API | SPL tokens |

## Smart Contracts

- **WorldInPaper** — game logic, trades, settlements, claims
- **WorldInPaperObserver** — read-optimized queries (ranking, portfolio, game lists)
- **ReceiverTemplate** — Chainlink CRE report receiver

## Team

Built at ETHGlobal Cannes 2026.
