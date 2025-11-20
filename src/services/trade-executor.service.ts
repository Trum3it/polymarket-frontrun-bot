import type { ClobClient } from '@polymarket/clob-client';
import type { Wallet } from 'ethers';
import type { RuntimeEnv } from '../config/env';
import type { Logger } from '../utils/logger.util';
import type { TradeSignal } from '../domain/trade.types';
import { computeProportionalSizing } from '../config/copy-strategy';
import { postOrder } from '../utils/post-order.util';
import { getUsdBalanceApprox } from '../utils/get-balance.util';
import { httpGet } from '../utils/fetch-data.util';

export type TradeExecutorDeps = {
  client: ClobClient & { wallet: Wallet };
  proxyWallet: string;
  env: RuntimeEnv;
  logger: Logger;
};

interface Position {
  conditionId: string;
  initialValue: number;
  currentValue: number;
}

export class TradeExecutorService {
  private readonly deps: TradeExecutorDeps;

  constructor(deps: TradeExecutorDeps) {
    this.deps = deps;
  }

  async copyTrade(signal: TradeSignal): Promise<void> {
    const { logger, env, client } = this.deps;
    try {
      const yourUsdBalance = await getUsdBalanceApprox(client.wallet, env.usdcContractAddress);
      const traderBalance = await this.getTraderBalance(signal.trader);

      const sizing = computeProportionalSizing({
        yourUsdBalance,
        traderUsdBalance: traderBalance,
        traderTradeUsd: signal.sizeUsd,
        multiplier: env.tradeMultiplier,
      });

      logger.info(
        `${signal.side} ${sizing.targetUsdSize.toFixed(2)} USD`,
      );

      await postOrder({
        client,
        marketId: signal.marketId,
        outcome: signal.outcome,
        side: signal.side,
        sizeUsd: sizing.targetUsdSize,
      });
    } catch (err) {
      logger.error('Failed to copy trade', err as Error);
    }
  }

  private async getTraderBalance(trader: string): Promise<number> {
    try {
      const positions: Position[] = await httpGet<Position[]>(
        `https://data-api.polymarket.com/positions?user=${trader}`,
      );
      const totalValue = positions.reduce((sum, pos) => sum + (pos.currentValue || pos.initialValue || 0), 0);
      return Math.max(100, totalValue);
    } catch {
      return 1000;
    }
  }
}

