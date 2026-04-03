import {
  type Asset,
  type Game,
  GameStatus,
  Origin,
  type Player,
  type Position,
  type UserProfile,
} from '@/types';

const NOW = Date.now();
const HOUR = 3600_000;
const DAY = 86400_000;

// ============================================================
// Assets
// ============================================================

export const MOCK_ASSETS: Asset[] = [
  // Crypto — Hyperliquid perps
  { symbol: 'BTC', name: 'Bitcoin', price: 83949.5, change24h: 2.1, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/BTC.svg', address: 'BTC' },
  { symbol: 'ETH', name: 'Ethereum', price: 2060.45, change24h: -0.3, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/ETH.svg', address: 'ETH' },
  { symbol: 'SOL', name: 'Solana', price: 179.02, change24h: 5.2, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/SOL.svg', address: 'SOL' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.1823, change24h: 1.8, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/DOGE.svg', address: 'DOGE' },
  { symbol: 'AVAX', name: 'Avalanche', price: 38.72, change24h: -1.4, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/AVAX.svg', address: 'AVAX' },
  { symbol: 'LINK', name: 'Chainlink', price: 14.85, change24h: 3.7, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/LINK.svg', address: 'LINK' },
  { symbol: 'ARB', name: 'Arbitrum', price: 1.12, change24h: -2.1, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/ARB.svg', address: 'ARB' },
  { symbol: 'MATIC', name: 'Polygon', price: 0.58, change24h: 0.9, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/MATIC.svg', address: 'MATIC' },
  { symbol: 'OP', name: 'Optimism', price: 1.74, change24h: 4.2, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/OP.svg', address: 'OP' },
  { symbol: 'SUI', name: 'Sui', price: 1.32, change24h: -0.7, category: 'crypto', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/SUI.svg', address: 'SUI' },

  // Stocks — Hyperliquid xyz
  { symbol: 'AAPL', name: 'Apple', price: 254.61, change24h: 1.1, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:AAPL.svg', address: 'xyz:AAPL' },
  { symbol: 'TSLA', name: 'Tesla', price: 178.23, change24h: -3.2, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:TSLA.svg', address: 'xyz:TSLA' },
  { symbol: 'GOOGL', name: 'Alphabet', price: 294.82, change24h: 0.5, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:GOOGL.svg', address: 'xyz:GOOGL' },
  { symbol: 'AMZN', name: 'Amazon', price: 209.03, change24h: 2.3, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:AMZN.svg', address: 'xyz:AMZN' },
  { symbol: 'GOLD', name: 'Gold', price: 4661.15, change24h: 0.8, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:GOLD.svg', address: 'xyz:GOLD' },
  { symbol: 'SP500', name: 'S&P 500', price: 5890.25, change24h: -0.4, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:SP500.svg', address: 'xyz:SP500' },
  { symbol: 'EUR', name: 'EUR/USD', price: 1.151, change24h: 0.2, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:EUR.svg', address: 'xyz:EUR' },
  { symbol: 'COIN', name: 'Coinbase', price: 171.22, change24h: -1.8, category: 'stocks', origin: Origin.Hyperliquid, iconUrl: 'https://app.hyperliquid.xyz/coins/xyz:COIN.svg', address: 'xyz:COIN' },

  // Solana tokens
  { symbol: 'JUP', name: 'Jupiter', price: 0.89, change24h: 6.4, category: 'solana', origin: Origin.Solana, iconUrl: 'https://app.hyperliquid.xyz/coins/JUP.svg', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { symbol: 'BONK', name: 'Bonk', price: 0.0000234, change24h: 12.3, category: 'solana', origin: Origin.Solana, iconUrl: 'https://app.hyperliquid.xyz/coins/BONK.svg', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'WIF', name: 'dogwifhat', price: 0.672, change24h: -4.1, category: 'solana', origin: Origin.Solana, iconUrl: 'https://app.hyperliquid.xyz/coins/WIF.svg', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: 'PIPPIN', name: 'Pippin', price: 0.03095, change24h: 8.7, category: 'solana', origin: Origin.Solana, iconUrl: 'https://app.hyperliquid.xyz/coins/PIPPIN.svg', address: 'Dfh5DzRgSvvCFDoYc2ciTkMrbDfRKybA4SoFbPmApump' },
  { symbol: 'RENDER', name: 'Render', price: 4.82, change24h: 2.9, category: 'solana', origin: Origin.Solana, iconUrl: 'https://app.hyperliquid.xyz/coins/RENDER.svg', address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof' },
];

// ============================================================
// Players
// ============================================================

const MOCK_PLAYERS: Record<string, Player[]> = {
  'game-3': [
    { address: '0xUser1', username: 'yazh', portfolioValue: 5420.30, pnl: 420.30, pnlPercent: 8.4, rank: 1 },
    { address: '0xUser2', username: 'alice.eth', portfolioValue: 5160.00, pnl: 160.00, pnlPercent: 3.2, rank: 2 },
    { address: '0xUser3', username: 'bob', portfolioValue: 5055.00, pnl: 55.00, pnlPercent: 1.1, rank: 3 },
    { address: '0xUser4', username: 'charlie', portfolioValue: 4870.00, pnl: -130.00, pnlPercent: -2.6, rank: 4 },
    { address: '0xUser5', username: 'dave.wld', portfolioValue: 4720.00, pnl: -280.00, pnlPercent: -5.6, rank: 5 },
  ],
  'game-4': [
    { address: '0xUser1', username: 'yazh', portfolioValue: 10850.00, pnl: 850.00, pnlPercent: 8.5, rank: 2 },
    { address: '0xUser6', username: 'emma', portfolioValue: 11200.00, pnl: 1200.00, pnlPercent: 12.0, rank: 1 },
    { address: '0xUser7', username: 'frank', portfolioValue: 10200.00, pnl: 200.00, pnlPercent: 2.0, rank: 3 },
    { address: '0xUser8', username: 'grace', portfolioValue: 9500.00, pnl: -500.00, pnlPercent: -5.0, rank: 4 },
  ],
};

// ============================================================
// Games
// ============================================================

export const MOCK_GAMES: Game[] = [
  // Upcoming
  {
    id: 'game-1',
    name: 'Speed Round',
    entryAmount: 5,
    startingCapital: 5000,
    startTime: NOW + 2 * HOUR,
    endTime: NOW + 6 * HOUR,
    maxPlayers: 10,
    playerCount: 3,
    creator: '0xCreator1',
    status: GameStatus.Upcoming,
    players: [],
  },
  {
    id: 'game-2',
    name: 'Weekend Cup',
    entryAmount: 25,
    startingCapital: 10000,
    startTime: NOW + 6 * HOUR,
    endTime: NOW + 2 * DAY,
    maxPlayers: 20,
    playerCount: 8,
    creator: '0xCreator2',
    status: GameStatus.Upcoming,
    players: [],
  },

  // Active
  {
    id: 'game-3',
    name: 'Crypto Arena',
    entryAmount: 10,
    startingCapital: 5000,
    startTime: NOW - 1 * HOUR,
    endTime: NOW + 4 * HOUR,
    maxPlayers: 10,
    playerCount: 5,
    creator: '0xCreator3',
    status: GameStatus.Active,
    players: MOCK_PLAYERS['game-3'],
  },
  {
    id: 'game-4',
    name: 'Whale League',
    entryAmount: 50,
    startingCapital: 10000,
    startTime: NOW - 3 * HOUR,
    endTime: NOW + 12 * HOUR,
    maxPlayers: 8,
    playerCount: 4,
    creator: '0xUser1',
    status: GameStatus.Active,
    players: MOCK_PLAYERS['game-4'],
  },

  // Ended
  {
    id: 'game-5',
    name: 'Morning Sprint',
    entryAmount: 10,
    startingCapital: 5000,
    startTime: NOW - 2 * DAY,
    endTime: NOW - 1 * DAY,
    maxPlayers: 6,
    playerCount: 6,
    creator: '0xCreator5',
    status: GameStatus.Ended,
    players: [
      { address: '0xUser1', username: 'yazh', portfolioValue: 7100, pnl: 2100, pnlPercent: 42, rank: 1 },
      { address: '0xUser2', username: 'alice.eth', portfolioValue: 5800, pnl: 800, pnlPercent: 16, rank: 2 },
      { address: '0xUser3', username: 'bob', portfolioValue: 5200, pnl: 200, pnlPercent: 4, rank: 3 },
      { address: '0xUser4', username: 'charlie', portfolioValue: 4900, pnl: -100, pnlPercent: -2, rank: 4 },
      { address: '0xUser5', username: 'dave.wld', portfolioValue: 4500, pnl: -500, pnlPercent: -10, rank: 5 },
      { address: '0xUser6', username: 'emma', portfolioValue: 4200, pnl: -800, pnlPercent: -16, rank: 6 },
    ],
  },
  {
    id: 'game-6',
    name: 'Degen Hour',
    entryAmount: 100,
    startingCapital: 50000,
    startTime: NOW - 4 * DAY,
    endTime: NOW - 3 * DAY,
    maxPlayers: 4,
    playerCount: 4,
    creator: '0xCreator6',
    status: GameStatus.Ended,
    players: [
      { address: '0xUser7', username: 'frank', portfolioValue: 62000, pnl: 12000, pnlPercent: 24, rank: 1 },
      { address: '0xUser1', username: 'yazh', portfolioValue: 54000, pnl: 4000, pnlPercent: 8, rank: 2 },
      { address: '0xUser8', username: 'grace', portfolioValue: 48000, pnl: -2000, pnlPercent: -4, rank: 3 },
      { address: '0xUser9', username: 'hank', portfolioValue: 41000, pnl: -9000, pnlPercent: -18, rank: 4 },
    ],
  },
];

// ============================================================
// Positions (per game)
// ============================================================

export const MOCK_POSITIONS: Record<string, Position[]> = {
  'game-3': [
    {
      id: 'pos-1',
      asset: MOCK_ASSETS[1], // ETH
      side: 'buy',
      entryPrice: 2020.00,
      currentPrice: 2060.45,
      quantity: 0.5,
      value: 1030.23,
      pnl: 20.23,
      pnlPercent: 2.0,
    },
    {
      id: 'pos-2',
      asset: MOCK_ASSETS[0], // BTC
      side: 'buy',
      entryPrice: 82500.00,
      currentPrice: 83949.50,
      quantity: 0.01,
      value: 839.50,
      pnl: 14.50,
      pnlPercent: 1.8,
    },
    {
      id: 'pos-3',
      asset: MOCK_ASSETS[10], // AAPL
      side: 'sell',
      entryPrice: 260.00,
      currentPrice: 254.61,
      quantity: 4,
      value: 1018.44,
      pnl: 21.56,
      pnlPercent: 2.1,
    },
  ],
  'game-4': [
    {
      id: 'pos-4',
      asset: MOCK_ASSETS[2], // SOL
      side: 'buy',
      entryPrice: 165.00,
      currentPrice: 179.02,
      quantity: 10,
      value: 1790.20,
      pnl: 140.20,
      pnlPercent: 8.5,
    },
    {
      id: 'pos-5',
      asset: MOCK_ASSETS[14], // GOLD
      side: 'buy',
      entryPrice: 4580.00,
      currentPrice: 4661.15,
      quantity: 0.5,
      value: 2330.58,
      pnl: 40.58,
      pnlPercent: 1.8,
    },
    {
      id: 'pos-6',
      asset: MOCK_ASSETS[18], // JUP
      side: 'buy',
      entryPrice: 0.72,
      currentPrice: 0.89,
      quantity: 500,
      value: 445.00,
      pnl: 85.00,
      pnlPercent: 23.6,
    },
    {
      id: 'pos-7',
      asset: MOCK_ASSETS[11], // TSLA
      side: 'sell',
      entryPrice: 185.00,
      currentPrice: 178.23,
      quantity: 5,
      value: 891.15,
      pnl: 33.85,
      pnlPercent: 3.7,
    },
  ],
};

// ============================================================
// User
// ============================================================

export const MOCK_CURRENT_ADDRESS = '0xUser1';

export const MOCK_USER: UserProfile = {
  address: MOCK_CURRENT_ADDRESS,
  username: 'yazh',
  profilePictureUrl: undefined,
  gamesPlayed: 12,
  winRate: 58,
  avgReturn: 7.3,
  bestReturn: 42,
  totalEarnings: 340,
  gameHistory: [
    { gameId: 'game-5', gameName: 'Morning Sprint', rank: 1, totalPlayers: 6, pnlPercent: 42, payout: 40, endedAt: NOW - 1 * DAY },
    { gameId: 'game-6', gameName: 'Degen Hour', rank: 2, totalPlayers: 4, pnlPercent: 8, payout: 100, endedAt: NOW - 3 * DAY },
    { gameId: 'game-old-1', gameName: 'Quick Trade', rank: 4, totalPlayers: 6, pnlPercent: -5.2, payout: 0, endedAt: NOW - 5 * DAY },
    { gameId: 'game-old-2', gameName: 'Pro League', rank: 1, totalPlayers: 8, pnlPercent: 18.7, payout: 200, endedAt: NOW - 8 * DAY },
  ],
};

// ============================================================
// Helpers
// ============================================================

export function getMyGames(): Game[] {
  return MOCK_GAMES.filter((g) =>
    g.players.some((p) => p.address === MOCK_CURRENT_ADDRESS),
  );
}

export function getMyPlayer(game: Game): Player | undefined {
  return game.players.find((p) => p.address === MOCK_CURRENT_ADDRESS);
}

export function getExploreGames(): Game[] {
  return MOCK_GAMES.filter(
    (g) => g.status === GameStatus.Upcoming || g.status === GameStatus.Active,
  );
}

export function getAssetsByCategory(category: 'crypto' | 'stocks' | 'solana'): Asset[] {
  return MOCK_ASSETS.filter((a) => a.category === category);
}
