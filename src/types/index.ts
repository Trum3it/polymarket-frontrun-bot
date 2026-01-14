/**
 * Polymarket API Types and Interfaces
 */

export interface Market {
  id: string;
  question: string;
  slug: string;
  description?: string;
  endDate?: string;
  image?: string;
  icon?: string;
  resolutionSource?: string;
  tags?: string[];
  liquidity?: number;
  volume?: number;
  active?: boolean;
}

export interface Position {
  id: string;
  market: Market;
  outcome: string;
  quantity: string;
  price: string;
  value: string;
  initialValue?: string; // Original cost basis
  timestamp: string;
}

export interface Trade {
  id: string;
  market: Market;
  outcome: string;
  side: 'buy' | 'sell';
  quantity: string;
  price: string;
  timestamp: string;
  transactionHash?: string;
  user: string;
}

export interface UserPositions {
  user: string;
  positions: Position[];
  totalValue: string;
  timestamp: string;
}

export interface UserTrades {
  user: string;
  trades: Trade[];
  totalTrades: number;
  timestamp: string;
}

export interface TradingStatus {
  user: string;
  totalPositions: number;
  totalValue: string;
  recentTrades: Trade[];
  openPositions: Position[];
  lastUpdated: string;
}

export interface PolymarketConfig {
  apiKey?: string;
  baseUrl?: string;
  dataApiUrl?: string;
  gammaApiUrl?: string;
  clobApiUrl?: string;
}

export interface MonitorOptions {
  targetAddress: string;
  pollInterval?: number; // in milliseconds
  enableWebSocket?: boolean;
  onUpdate?: (status: TradingStatus) => void;
  onError?: (error: Error) => void;
}

export interface CopyTradingConfig {
  enabled: boolean;
  privateKey: string; // Private key for wallet signing
  dryRun?: boolean; // If true, only simulate trades without executing
  positionSizeMultiplier?: number; // Multiply target position size by this (default: 1.0)
  maxPositionSize?: number; // Maximum position size in USD (default: unlimited)
  maxTradeSize?: number; // Maximum single trade size in USD (default: unlimited)
  slippageTolerance?: number; // Slippage tolerance as percentage (default: 1%)
  minTradeSize?: number; // Minimum trade size in USD to execute (default: 1)
  chainId?: number; // Chain ID (default: 137 for Polygon)
  clobHost?: string; // CLOB API host (default: https://clob.polymarket.com)
  onTradeExecuted?: (result: TradeExecutionResult) => void;
  onTradeError?: (error: Error, position: Position) => void;
}

export interface TradeExecutionResult {
  success: boolean;
  position: Position;
  orderId?: string;
  transactionHash?: string;
  executedQuantity?: string;
  executedPrice?: string;
  error?: string;
  dryRun: boolean;
}

export interface CopyTradingStatus {
  enabled: boolean;
  dryRun: boolean;
  totalTradesExecuted: number;
  totalTradesFailed: number;
  totalVolume: string;
  lastTradeTime?: string;
}
