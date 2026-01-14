/**
 * Basic usage example for Polymarket Account Monitor
 */

import { AccountMonitor, PolymarketClient } from '../src';

async function main() {
  // Replace with the address you want to monitor
  const targetAddress = process.env.TARGET_ADDRESS || '0x1234567890123456789012345678901234567890';

  // Create API client
  const client = new PolymarketClient({
    // Optional: Add API key if required
    // apiKey: process.env.POLYMARKET_API_KEY,
  });

  // Create monitor instance
  const monitor = new AccountMonitor(client, {
    targetAddress,
    pollInterval: 30000, // Poll every 30 seconds
    enableWebSocket: false,
    onUpdate: (status) => {
      // Display formatted status
      console.log(monitor.getFormattedStatus(status));
    },
    onError: (error) => {
      console.error('Monitor error:', error.message);
    },
  });

  // Start monitoring
  console.log(`Starting monitor for address: ${targetAddress}`);
  await monitor.start();

  // Keep the process running
  // In a real application, you might want to handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\nStopping monitor...');
    monitor.stop();
    process.exit(0);
  });
}

main().catch(console.error);
