import type { ClobClient } from '@polymarket/clob-client';
import type { RuntimeEnv } from '../config/env';
import type { Logger } from '../utils/logger.util';
import type { TradeSignal } from '../domain/trade.types';
import { ethers } from 'ethers';
import { httpGet } from '../utils/fetch-data.util';
import axios from 'axios';

export type MempoolMonitorDeps = {
  client: ClobClient;
  env: RuntimeEnv;
  logger: Logger;
  onDetectedTrade: (signal: TradeSignal) => Promise<void>;
};

// Polymarket contract addresses on Polygon
const POLYMARKET_CONTRACTS = [
  '0x4bfb41d5b3570dfe5a4bde6f4f13907e456f2b13', // ConditionalTokens
  '0x89c5cc945dd550bcffb72fe42bff002429f46fec', // Polymarket CLOB
];

interface ActivityResponse {
  type: string;
  timestamp: number;
  conditionId: string;
  asset: string;
  size: number;
  usdcSize: number;
  price: number;
  side: string;
  outcomeIndex: number;
  transactionHash: string;
  status?: string; // 'pending' | 'confirmed'
}

export class MempoolMonitorService {
  private readonly deps: MempoolMonitorDeps;
  private provider?: ethers.providers.JsonRpcProvider;
  private isRunning = false;
  private readonly processedHashes: Set<string> = new Set();
  private readonly targetAddresses: Set<string> = new Set();
  private timer?: NodeJS.Timeout;
  private readonly lastFetchTime: Map<string, number> = new Map();

  constructor(deps: MempoolMonitorDeps) {
    this.deps = deps;
    POLYMARKET_CONTRACTS.forEach((addr) => this.targetAddresses.add(addr.toLowerCase()));
  }

  async start(): Promise<void> {
    const { logger, env } = this.deps;
    logger.info('Starting Polymarket Frontrun Bot - Mempool Monitor');
    
    this.provider = new ethers.providers.JsonRpcProvider(env.rpcUrl);
    this.isRunning = true;

    // Subscribe to pending transactions
    this.provider.on('pending', (txHash: string) => {
      if (this.isRunning) {
        void this.handlePendingTransaction(txHash).catch(() => {
          // Silently handle errors for mempool monitoring
        });
      }
    });

    // Also monitor Polymarket API for recent orders (hybrid approach)
    // This helps catch orders that might not be in mempool yet
    this.timer = setInterval(() => void this.monitorRecentOrders().catch(() => undefined), env.fetchIntervalSeconds * 1000);
    await this.monitorRecentOrders();

    logger.info('Mempool monitoring active. Waiting for pending transactions...');
  }

  stop(): void {
    this.isRunning = false;
    if (this.provider) {
      this.provider.removeAllListeners('pending');
    }
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.deps.logger.info('Mempool monitoring stopped');
  }

  private async handlePendingTransaction(txHash: string): Promise<void> {
    // Skip if already processed
    if (this.processedHashes.has(txHash)) {
      return;
    }

    try {
      const tx = await this.provider!.getTransaction(txHash);
      if (!tx) {
        return;
      }

      const toAddress = tx.to?.toLowerCase();
      if (!toAddress || !this.targetAddresses.has(toAddress)) {
        return;
      }

      // For now, we'll rely on API monitoring for trade details
      // Mempool monitoring helps us detect transactions early
      // The actual trade parsing happens in monitorRecentOrders
    } catch {
      // Expected - transaction might not be available yet
    }
  }

  private async monitorRecentOrders(): Promise<void> {
    const { logger, env } = this.deps;
    
    // Monitor all addresses from env (these are the addresses we want to frontrun)
    for (const targetAddress of env.targetAddresses) {
      try {
        await this.checkRecentActivity(targetAddress);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          continue;
        }
        logger.debug(`Error checking activity for ${targetAddress}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private async checkRecentActivity(targetAddress: string): Promise<void> {
    const { logger, env } = this.deps;
    
    try {
      const url = `https://data-api.polymarket.com/activity?user=${targetAddress}`;
      const activities: ActivityResponse[] = await httpGet<ActivityResponse[]>(url);

      const now = Math.floor(Date.now() / 1000);
      const cutoffTime = now - 60; // Only check very recent activities (last 60 seconds)

      for (const activity of activities) {
        if (activity.type !== 'TRADE') continue;

        const activityTime = typeof activity.timestamp === 'number' 
          ? activity.timestamp 
          : Math.floor(new Date(activity.timestamp).getTime() / 1000);
        
        // Only process very recent trades (potential frontrun targets)
        if (activityTime < cutoffTime) continue;
        
        // Skip if already processed
        if (this.processedHashes.has(activity.transactionHash)) continue;

        const lastTime = this.lastFetchTime.get(targetAddress) || 0;
        if (activityTime <= lastTime) continue;

        // Check minimum trade size
        const sizeUsd = activity.usdcSize || activity.size * activity.price;
        const minTradeSize = env.minTradeSizeUsd || 100;
        if (sizeUsd < minTradeSize) continue;

        // Check if transaction is still pending (frontrun opportunity)
        const txStatus = await this.checkTransactionStatus(activity.transactionHash);
        if (txStatus === 'confirmed') {
          // Too late to frontrun
          this.processedHashes.add(activity.transactionHash);
          continue;
        }

        logger.info(
          `[Frontrun] Detected pending trade: ${activity.side.toUpperCase()} ${sizeUsd.toFixed(2)} USD on market ${activity.conditionId}`,
        );

        const signal: TradeSignal = {
          trader: targetAddress,
          marketId: activity.conditionId,
          tokenId: activity.asset,
          outcome: activity.outcomeIndex === 0 ? 'YES' : 'NO',
          side: activity.side.toUpperCase() as 'BUY' | 'SELL',
          sizeUsd,
          price: activity.price,
          timestamp: activityTime * 1000,
          pendingTxHash: activity.transactionHash,
        };

        this.processedHashes.add(activity.transactionHash);
        this.lastFetchTime.set(targetAddress, Math.max(this.lastFetchTime.get(targetAddress) || 0, activityTime));

        // Execute frontrun
        await this.deps.onDetectedTrade(signal);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return;
      }
      throw err;
    }
  }

  private async checkTransactionStatus(txHash: string): Promise<'pending' | 'confirmed'> {
    try {
      const receipt = await this.provider!.getTransactionReceipt(txHash);
      return receipt ? 'confirmed' : 'pending';
    } catch {
      return 'pending';
    }
  }
}

