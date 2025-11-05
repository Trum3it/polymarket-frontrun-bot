import 'dotenv/config';
import { loadEnv } from '../modules/config/env';
import { createPolymarketClient } from '../modules/services/createClobClient';
import { ConsoleLogger } from '../modules/utils/logger';

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  const env = loadEnv();
  const client = await createPolymarketClient({ rpcUrl: env.rpcUrl, privateKey: env.privateKey });

  // Placeholder: Replace with actual allowance query
  logger.info(`Wallet: ${client.wallet.address}`);
  logger.info('Allowance check not implemented in scaffold.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


