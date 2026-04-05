# World In Paper — Mini App

Next.js frontend running inside World App via MiniKit SDK.

## Setup

```bash
cp .env.sample .env.local
# Fill in the values
pnpm install
pnpm dev
```

Test with ngrok + World App:
```bash
ngrok http 3000
# Set AUTH_URL to your ngrok URL in .env.local
# Scan QR code in World App
```

## Features

- Create & join games with USDC buy-in
- Trade crypto, stocks, commodities across all chains
- Real-time portfolio tracking with live prices
- Leaderboard with total portfolio value (cash + positions)
- Claim rewards when game ends
- Top up USDC by swapping tokens (Uniswap V3)
- World ID verification for sybil protection
