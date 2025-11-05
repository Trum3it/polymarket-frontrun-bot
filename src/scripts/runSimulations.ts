import 'dotenv/config';
import { ConsoleLogger } from '../modules/utils/logger';

async function run(): Promise<void> {
  const logger = new ConsoleLogger();
  logger.info('Simulation runner starting...');
  logger.info('Implement your backtesting logic in docs/SIMULATION.md');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


