export type TradeSignal = {
  trader: string;
  marketId: string;
  tokenId: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  sizeUsd: number;
  price: number;
  timestamp: number;
  pendingTxHash?: string; // For frontrunning - the transaction we're trying to frontrun
  targetGasPrice?: string; // Gas price of the target transaction
};

export type TradeEvent = {
  trader: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  sizeUsd: number;
  price: number;
  timestamp: number;
};

