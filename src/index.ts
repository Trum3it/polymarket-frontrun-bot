import 'dotenv/config';
import { loadEnv } from './modules/config/env';
import { createPolymarketClient } from './modules/services/createClobClient';
import { TradeMonitor } from './modules/services/tradeMonitor';
import { TradeExecutor } from './modules/services/tradeExecutor';
import { ConsoleLogger } from './modules/utils/logger';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();

  logger.info('Starting Polymarket Copy Trading Bot');

  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });
  const executor = new TradeExecutor({ client, proxyWallet: env.proxyWallet, logger, env });

  const monitor = new TradeMonitor({
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
  // eslint-disable-next-line no-console
  console.error('Fatal error', err);
  process.exit(1);
});


