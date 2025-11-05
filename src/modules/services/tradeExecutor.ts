import type { ClobClient } from '@polymarket/clob-client';
import type { RuntimeEnv } from '../config/env';
import type { Logger } from '../utils/logger';
import type { TradeSignal } from './tradeMonitor';
import { computeProportionalSizing } from '../config/copyStrategy';
import { postOrder } from '../utils/postOrder';
import { getUsdBalanceApprox } from '../utils/getMyBalance';

export type TradeExecutorDeps = {
  client: ClobClient;
  proxyWallet: string;
  env: RuntimeEnv;
  logger: Logger;
};

export class TradeExecutor {
  private readonly deps: TradeExecutorDeps;

  constructor(deps: TradeExecutorDeps) {
    this.deps = deps;
  }

  async copyTrade(signal: TradeSignal): Promise<void> {
    const { logger, env, client } = this.deps;
    try {
      const yourUsdBalance = await getUsdBalanceApprox(client.wallet);
      const sizing = computeProportionalSizing({
        yourUsdBalance,
        traderUsdBalance: Math.max(1, signal.sizeUsd * 20), // rough guess; replace with real data
        traderTradeUsd: signal.sizeUsd,
        multiplier: env.tradeMultiplier,
      });

      logger.info(`Sizing ratio ${(sizing.ratio * 100).toFixed(2)}% => ${sizing.targetUsdSize.toFixed(2)} USD`);

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
}


