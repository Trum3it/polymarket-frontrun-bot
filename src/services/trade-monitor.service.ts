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
  userAddresses: string[];
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
      `Monitoring trader(${this.deps.userAddresses.join(', ')})...`,
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
      for (const trader of this.deps.userAddresses) {
        await this.fetchTraderActivities(trader, env);
      }
    } catch (err) {
      logger.error('Monitor tick failed', err as Error);
    }
  }

  private async fetchTraderActivities(trader: string, env: RuntimeEnv): Promise<void> {
    try {
      const url = `https://data-api.polymarket.com/activities?user=${trader}`;
      const activities: ActivityResponse[] = await httpGet<ActivityResponse[]>(url);

      const now = Math.floor(Date.now() / 1000);
      const cutoffTime = now - env.aggregationWindowSeconds;

      for (const activity of activities) {
        if (activity.type !== 'TRADE') continue;
        const activityTime = typeof activity.timestamp === 'number' ? activity.timestamp : Math.floor(new Date(activity.timestamp).getTime() / 1000);
        if (activityTime < cutoffTime) continue;
        if (this.processedHashes.has(activity.transactionHash)) continue;

        const lastTime = this.lastFetchTime.get(trader) || 0;
        if (activityTime <= lastTime) continue;

        const signal: TradeSignal = {
          trader,
          marketId: activity.conditionId,
          outcome: activity.outcomeIndex === 0 ? 'YES' : 'NO',
          side: activity.side.toUpperCase() as 'BUY' | 'SELL',
          sizeUsd: activity.usdcSize || activity.size * activity.price,
          price: activity.price,
          timestamp: activityTime * 1000,
        };

        this.processedHashes.add(activity.transactionHash);
        this.lastFetchTime.set(trader, Math.max(this.lastFetchTime.get(trader) || 0, activityTime));

        await this.deps.onDetectedTrade(signal);
      }
    } catch (err) {
      // Handle 404 gracefully - user might have no activities yet or endpoint doesn't exist
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        // Silently skip - user may not have any activities or endpoint changed
        return;
      }
      // Log other errors
      this.deps.logger.error(`Failed to fetch activities for ${trader}`, err as Error);
    }
  }
}

