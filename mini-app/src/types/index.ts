export enum Origin {
  Solana = 0,
  Base = 1,
  Ethereum = 2,
  Bsc = 3,
  World = 4,
  Hyperliquid = 5,
}

export enum GameStatus {
  Upcoming = 'upcoming',
  Active = 'active',
  Ended = 'ended',
}

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
