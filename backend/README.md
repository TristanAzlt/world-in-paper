# Backend API - World In Paper

This document describes the backend (`Express + TypeScript`) in detail, including:

-   Exposed routes
-   Expected input data (query/body)
-   Applied validations
-   Response payloads
-   Possible errors
-   Main service responsibilities

## Overview

-   Local base URL: `http://localhost:<PORT>` (default `3000`)
-   Mounted routes:

1. `GET /assets`
2. `POST /quote`
3. `GET /games/recent`
4. `GET /games/created`
5. `GET /games/joined`
6. `GET /games/ranking`
7. `GET /games/portfolio`

## Supported Origins

Allowed values for `origin`:

-   `base`
-   `ethereum`
-   `bsc`
-   `solana`
-   `worldchain`
-   `hyperliquid`

## Error Format

The backend generally returns:

```json
{
	"error": "Invalid query",
	"details": [
		{
			"path": "origin",
			"message": "Invalid enum value"
		}
	]
}
```

Notes:

-   Zod validation errors return `400`.
-   Runtime/business errors return `500`.
-   `details` contains either a validation error list or a technical message.

## Endpoint `GET /assets`

Returns assets for a given origin.

-   Required query:
    -   `origin`: enum from supported origins.

### Behavior

-   Redis cache by origin for `60` seconds (`assets:origin:<origin>`).
-   If `origin = hyperliquid`:
    -   Response includes both `tokens` and `categories`.
    -   Categories are controlled by a local whitelist (`hyperliquid-assets.json`).
-   If `origin != hyperliquid`:
    -   Data comes from GeckoTerminal trending pools.
    -   Tokens are filtered/deduplicated.

### `200` Response (GeckoTerminal origins)

```json
{
	"origin": "base",
	"tokens": [
		{
			"origin": "base",
			"address": "0x...",
			"name": "Token Name",
			"symbol": "TKN",
			"image": "https://...",
			"price": 1.234,
			"market_cap": 1234567.89
		}
	]
}
```

### `200` Response (Hyperliquid origin)

```json
{
	"origin": "hyperliquid",
	"tokens": [
		{
			"origin": "hyperliquid",
			"category": "crypto",
			"address": "BTC",
			"name": "BTC",
			"symbol": "BTC",
			"image": "https://app.hyperliquid.xyz/coins/BTC.svg",
			"price": 64000,
			"market_cap": 123456789
		}
	],
	"categories": {
		"crypto": [],
		"stocks": [],
		"indices": [],
		"commodities": []
	}
}
```

Notes:

-   Hyperliquid `address` stays compatible with `allMids` keys (`BTC`, `ETH`, `xyz:TSLA`, `@12`, etc.).
-   Tokens without valid image/price/market cap are ignored.

## Endpoint `POST /quote`

Computes a quote price based on origin.

### Expected Body

```json
{
	"assetId": "0x... or mint or symbol",
	"origin": "base",
	"isBuy": true,
	"amount": "1000000"
}
```

Validation:

-   `assetId`: non-empty string
-   `origin`: supported enum
-   `isBuy`: boolean
-   `amount`: numeric string (`^\\d+$`), no decimal in payload

### Price Provider Routing

-   `solana` -> Jupiter
-   `base`, `ethereum`, `bsc`, `worldchain` -> Uniswap Trade API
-   `hyperliquid` -> Hyperliquid `allMids`

### `200` Response

```json
{
	"assetId": "0x...",
	"origin": "base",
	"isBuy": true,
	"amount": "1000000",
	"price": 1.04231
}
```

`price` is always a strictly positive number.

## Endpoint `GET /games/recent`

Returns the latest created games.

-   Optional query:
    -   `limit`: integer > 0, max `100`, default `20`.

### `200` Response

```json
{
	"games": [
		{
			"id": "12",
			"entryAmount": "1000000",
			"startingWIPBalance": "100000000",
			"startTime": "1712000000",
			"endTime": "1712600000",
			"maxPlayers": 100,
			"playerCount": 10,
			"creator": "0x...",
			"exists": true
		}
	]
}
```

## Endpoint `GET /games/created`

Returns games created by a user.

-   Required query:
    -   `user`: valid EVM address (`0x` + 40 hex chars)
-   Optional query:
    -   `limit`: integer > 0, max `100`, default `20`

### `200` Response

```json
{
	"user": "0x...",
	"games": [
		{
			"id": "5",
			"entryAmount": "1000000",
			"startingWIPBalance": "100000000",
			"startTime": "1712000000",
			"endTime": "1712600000",
			"maxPlayers": 100,
			"playerCount": 37,
			"creator": "0x...",
			"exists": true
		}
	]
}
```

## Endpoint `GET /games/joined`

Returns games joined by a user.

-   Required query:
    -   `user`: valid EVM address
-   Optional query:
    -   `limit`: integer > 0, max `100`, default `20`

### `200` Response

```json
{
	"user": "0x...",
	"games": [
		{
			"id": "9",
			"entryAmount": "1000000",
			"startingWIPBalance": "100000000",
			"startTime": "1712000000",
			"endTime": "1712600000",
			"maxPlayers": 100,
			"playerCount": 42,
			"creator": "0x...",
			"exists": true
		}
	]
}
```

## Endpoint `GET /games/ranking`

Returns the ranking for a game.

-   Required query:
    -   `gameId`: positive integer

### `200` Response

```json
{
	"gameId": "12",
	"ranking": [
		{
			"player": "0x...",
			"place": "1",
			"wipBalance": "125000000"
		}
	]
}
```

Notes:

-   On-chain numeric values are serialized as strings to avoid JS integer precision issues.

## Endpoint `GET /games/portfolio`

Returns a player's portfolio in a specific game.

-   Required query:
    -   `gameId`: positive integer
    -   `user`: valid EVM address

### `200` Response

```json
{
	"gameId": "12",
	"player": "0x...",
	"wipBalance": "100000000",
	"claimed": false,
	"claimableAmount": "0",
	"tokens": [
		{
			"asset_address": "BTC",
			"origin": "5",
			"balance": "1200000",
			"trades": [
				{
					"id": "3",
					"trader": "0x...",
					"asset_address": "BTC",
					"origin": "5",
					"isBuy": true,
					"amountIn": "1000000",
					"amountOut": "25000"
				}
			]
		}
	]
}
```

Notes:

-   `origin` in `tokens` and `trades` is contract-native and returned as a stringified numeric identifier.

## Internal Functions And Services

### `AssetsRoute`

-   Validates `origin` with Zod.
-   Handles Redis cache (60s).
-   Delegates to:
    -   `GeckoTerminalService.getTrendingAssetsByOrigin(origin)`
    -   `HyperliquidService.getCategorizedAssets()`

### `QuoteRoute`

-   Validates quote body.
-   Routes provider selection based on `origin`.
-   Normalizes quote response.

### `GamesRoute`

-   Validates query params (`limit`, `user`, `gameId`).
-   Calls `WorldInPaperService` for optimized on-chain views.
-   Converts `bigint` values to strings in HTTP payloads.

### `GeckoTerminalService`

-   Source: GeckoTerminal `trending_pools`.
-   Filtering:
    -   requires valid image + price + market cap
    -   deduplicates by address (keeps highest market cap)

### `HyperliquidService`

-   Source: Hyperliquid `/info` (`metaAndAssetCtxs`, `allMids`).
-   Combines main feed and `dex=xyz` feed.
-   Strictly filters with local whitelist and manual category mapping.

### `JupiterService`

-   Uses Jupiter quote API for Solana.
-   Reads token mint decimals via Solana RPC `getAccountInfo`.

### `UniswapService`

-   Uses Uniswap Trade API (`/v1/quote`).
-   Requires `UNISWAP_API_KEY`.
-   Handles chain IDs by EVM origin.

### `WorldInPaperService`

-   TypeChain wrapper around `WorldInPaper` contract.
-   Exposes reads: recent, created, joined games, ranking, and portfolio.

## Main Environment Variables

-   `PORT`
-   `RPC_URL`
-   `CONTRACT_ADDRESS`
-   `REDIS_URL`
-   `UNISWAP_API_KEY`
-   `REQUEST_TIMEOUT_MS`
-   `RATE_LIMIT_WINDOW_MS`
-   `RATE_LIMIT_MAX`
-   `BODY_LIMIT`
-   `CORS_ORIGIN`

See `src/config/env.ts` for exact defaults and validations.
