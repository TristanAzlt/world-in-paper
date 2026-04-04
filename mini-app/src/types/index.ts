// Must match smart contract enum Origin
export enum Origin {
  Solana = 0,
  Base = 1,
  Ethereum = 2,
  Bsc = 3,
  World = 4,
  Hyperliquid = 5,
}

export type OriginKey = 'solana' | 'base' | 'ethereum' | 'bsc' | 'worldchain' | 'hyperliquid';

export enum GameStatus {
  Upcoming = 'upcoming',
  Active = 'active',
  Ended = 'ended',
}

// Backend response types

export interface GameView {
  id: string;
  name: string;
  entryAmount: string;
  startingWIPBalance: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  playerCount: number;
  creator: string;
  exists: boolean;
}

export interface GameRankingEntry {
  player: string;
  place: string;
  wipBalance: string;
}

export interface TradeView {
  id: string;
  trader: string;
  asset_address: string;
  origin: string;
  isBuy: boolean;
  amountIn: string;
  amountOut: string;
}

export interface PortfolioToken {
  asset_address: string;
  origin: string;
  balance: string;
  trades: TradeView[];
}

export interface PlayerPortfolio {
  gameId: string;
  player: string;
  wipBalance: string;
  claimed: boolean;
  claimableAmount: string;
  tokens: PortfolioToken[];
}

export interface AssetToken {
  origin: string;
  address: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  market_cap: number;
  decimals?: number;
}

export interface HyperliquidAssets {
  origin: string;
  tokens: AssetToken[];
  categories: {
    crypto: AssetToken[];
    stocks: AssetToken[];
    indices: AssetToken[];
    commodities: AssetToken[];
  };
}

export interface QuoteResponse {
  assetId: string;
  origin: string;
  isBuy: boolean;
  amount: string;
  price: number;
}

// Helpers

export function getGameStatus(game: GameView): GameStatus {
  const now = Date.now() / 1000;
  const start = Number(game.startTime);
  const end = Number(game.endTime);
  if (now < start) return GameStatus.Upcoming;
  if (now >= end) return GameStatus.Ended;
  return GameStatus.Active;
}

export function formatWipBalance(raw: string): number {
  return Number(raw) / 1e6;
}

// Legacy types for existing components

export type AssetCategory = 'crypto' | 'stocks' | 'solana';

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  category: AssetCategory;
  origin: Origin;
  iconUrl: string;
  address: string;
}

export interface Position {
  id: string;
  asset: Asset;
  side: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface Player {
  address: string;
  username: string;
  profilePictureUrl?: string;
  portfolioValue: number;
  pnl: number;
  pnlPercent: number;
  rank: number;
}

export interface Game {
  id: string;
  name: string;
  entryAmount: number;
  startingCapital: number;
  startTime: number;
  endTime: number;
  maxPlayers: number;
  playerCount: number;
  creator: string;
  status: GameStatus;
  players: Player[];
}

export interface GameHistoryEntry {
  gameId: string;
  gameName: string;
  rank: number;
  totalPlayers: number;
  pnlPercent: number;
  payout: number;
  endedAt: number;
}

export interface UserProfile {
  address: string;
  username: string;
  profilePictureUrl?: string;
  gamesPlayed: number;
  winRate: number;
  avgReturn: number;
  bestReturn: number;
  totalEarnings: number;
  gameHistory: GameHistoryEntry[];
}
