import type { ClobClient } from '@polymarket/clob-client';
import type { Wallet } from 'ethers';
import type { RuntimeEnv } from '../config/env';
import type { Logger } from '../utils/logger.util';
import type { TradeSignal } from '../domain/trade.types';
import { postOrder } from '../utils/post-order.util';
import { getUsdBalanceApprox, getPolBalance } from '../utils/get-balance.util';
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

  async frontrunTrade(signal: TradeSignal): Promise<void> {
    const { logger, env, client } = this.deps;
    try {
      const yourUsdBalance = await getUsdBalanceApprox(client.wallet, env.usdcContractAddress);
      const polBalance = await getPolBalance(client.wallet);

      logger.info(`[Frontrun] Balance check - POL: ${polBalance.toFixed(4)} POL, USDC: ${yourUsdBalance.toFixed(2)} USDC`);

      // For frontrunning, we execute the same trade but with higher priority
      // Calculate frontrun size (typically smaller or same as target)
      const frontrunSize = this.calculateFrontrunSize(signal.sizeUsd, env);

      logger.info(
        `[Frontrun] Executing ${signal.side} ${frontrunSize.toFixed(2)} USD (target: ${signal.sizeUsd.toFixed(2)} USD)`,
      );

      // Balance validation
      const requiredUsdc = frontrunSize;
      const minPolForGas = 0.05; // Higher gas needed for frontrunning

      if (signal.side === 'BUY') {
        if (yourUsdBalance < requiredUsdc) {
          logger.error(
            `[Frontrun] Insufficient USDC balance. Required: ${requiredUsdc.toFixed(2)} USDC, Available: ${yourUsdBalance.toFixed(2)} USDC`,
          );
          return;
        }
      }

      if (polBalance < minPolForGas) {
        logger.error(
          `[Frontrun] Insufficient POL balance for gas. Required: ${minPolForGas} POL, Available: ${polBalance.toFixed(4)} POL`,
        );
        return;
      }

      // Execute frontrun order with priority
      // The postOrder function will use higher gas prices if configured
      await postOrder({
        client,
        marketId: signal.marketId,
        tokenId: signal.tokenId,
        outcome: signal.outcome,
        side: signal.side,
        sizeUsd: frontrunSize,
        priority: true, // Flag for priority execution
        targetGasPrice: signal.targetGasPrice,
      });
      
      logger.info(`[Frontrun] Successfully executed ${signal.side} order for ${frontrunSize.toFixed(2)} USD`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('closed') || errorMessage.includes('resolved') || errorMessage.includes('No orderbook')) {
        logger.warn(`[Frontrun] Skipping trade - Market ${signal.marketId} is closed or resolved: ${errorMessage}`);
      } else {
        logger.error(`[Frontrun] Failed to frontrun trade: ${errorMessage}`, err as Error);
      }
    }
  }

  private calculateFrontrunSize(targetSize: number, env: RuntimeEnv): number {
    // Frontrun with a percentage of the target size
    // This can be configured via env variable
    const frontrunMultiplier = env.frontrunSizeMultiplier || 0.5; // Default to 50% of target
    return targetSize * frontrunMultiplier;
  }

  // Keep copyTrade for backward compatibility, but redirect to frontrun
  async copyTrade(signal: TradeSignal): Promise<void> {
    return this.frontrunTrade(signal);
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


