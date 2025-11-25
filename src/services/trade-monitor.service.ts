import type { ClobClient } from '@polymarket/clob-client';
import type { RuntimeEnv } from '../config/env';
import type { Logger } from '../utils/logger.util';
import type { TradeSignal } from '../domain/trade.types';
import { httpGet } from '../utils/fetch-data.util';
import axios from 'axios';

export type TradeMonitorDeps = {
  client: ClobClient;
  env: RuntimeEnv;
  logger: Logger;
  targetAddresses: string[];
  onDetectedTrade: (signal: TradeSignal) => Promise<void>;
};

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
}

export class TradeMonitorService {
  private readonly deps: TradeMonitorDeps;
  private timer?: NodeJS.Timeout;
  private readonly processedHashes: Set<string> = new Set();
  private readonly lastFetchTime: Map<string, number> = new Map();

  constructor(deps: TradeMonitorDeps) {
    this.deps = deps;
  }

  async start(): Promise<void> {
    const { logger, env } = this.deps;
    logger.info(
      `Monitoring trader(${this.deps.targetAddresses.join(', ')})...`,
    );
    this.timer = setInterval(() => void this.tick().catch(() => undefined), env.fetchIntervalSeconds * 1000);
    await this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    const { logger, env } = this.deps;
    try {
      for (const trader of this.deps.targetAddresses) {
        await this.fetchTraderActivities(trader, env);
      }
    } catch (err) {
      logger.error('Monitor tick failed', err as Error);
    }
  }

  private async fetchTraderActivities(trader: string, env: RuntimeEnv): Promise<void> {
    try {
      const url = `https://data-api.polymarket.com/activity?user=${trader}`;
      const activities: ActivityResponse[] = await httpGet<ActivityResponse[]>(url);

      const now = Math.floor(Date.now() / 1000);
      const cutoffTime = now - env.aggregationWindowSeconds;

      this.deps.logger.info(`[Monitor] Fetched ${activities.length} activities for ${trader}`);

      let tradeCount = 0;
      let skippedOld = 0;
      let skippedProcessed = 0;
      let skippedBeforeLastTime = 0;

      for (const activity of activities) {
        if (activity.type !== 'TRADE') continue;
        tradeCount++;

        const activityTime = typeof activity.timestamp === 'number' ? activity.timestamp : Math.floor(new Date(activity.timestamp).getTime() / 1000);
        
        if (activityTime < cutoffTime) {
          skippedOld++;
          continue;
        }
        
        if (this.processedHashes.has(activity.transactionHash)) {
          skippedProcessed++;
          continue;
        }

        const lastTime = this.lastFetchTime.get(trader) || 0;
        if (activityTime <= lastTime) {
          skippedBeforeLastTime++;
          continue;
        }

        const signal: TradeSignal = {
          trader,
          marketId: activity.conditionId,
          tokenId: activity.asset,
          outcome: activity.outcomeIndex === 0 ? 'YES' : 'NO',
          side: activity.side.toUpperCase() as 'BUY' | 'SELL',
          sizeUsd: activity.usdcSize || activity.size * activity.price,
          price: activity.price,
          timestamp: activityTime * 1000,
        };

        this.deps.logger.info(`[Monitor] New trade detected: ${signal.side} ${signal.sizeUsd.toFixed(2)} USD on market ${signal.marketId}`);

        this.processedHashes.add(activity.transactionHash);
        this.lastFetchTime.set(trader, Math.max(this.lastFetchTime.get(trader) || 0, activityTime));

        await this.deps.onDetectedTrade(signal);
      }

      if (tradeCount > 0) {
        this.deps.logger.info(
          `[Monitor] ${trader}: ${tradeCount} trades found, ${skippedOld} too old, ${skippedProcessed} already processed, ${skippedBeforeLastTime} before last time`,
        );
      }
    } catch (err) {
      // Handle 404 gracefully - user might have no activities yet or endpoint doesn't exist
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        this.deps.logger.warn(`[Monitor] No activities found for ${trader} (404)`);
        return;
      }
      // Log other errors
      this.deps.logger.error(`Failed to fetch activities for ${trader}`, err as Error);
    }
  }
}

