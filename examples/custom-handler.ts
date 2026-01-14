/**
 * Example with custom status handling
 */

import { AccountMonitor, PolymarketClient, TradingStatus } from '../src';

async function main() {
  const targetAddress = process.env.TARGET_ADDRESS || '';

  if (!targetAddress) {
    console.error('Please set TARGET_ADDRESS environment variable');
    return;
  }

  const client = new PolymarketClient();
  const monitor = new AccountMonitor(client, {
    targetAddress,
    pollInterval: 60000, // 1 minute
    onUpdate: (status: TradingStatus) => {
      // Custom status handling
      console.log('\n=== Trading Status Update ===');
      console.log(`User: ${status.user}`);
      console.log(`Last Updated: ${new Date(status.lastUpdated).toLocaleString()}`);
      console.log(`\nPortfolio Summary:`);
      console.log(`  Total Positions: ${status.totalPositions}`);
      console.log(`  Total Value: $${parseFloat(status.totalValue).toFixed(2)}`);

      if (status.recentTrades.length > 0) {
        console.log(`\nRecent Trading Activity (${status.recentTrades.length} trades):`);
        status.recentTrades.forEach((trade, index) => {
          const side = trade.side === 'buy' ? '🟢 BUY' : '🔴 SELL';
          console.log(`  ${index + 1}. ${side} ${trade.quantity} shares @ $${parseFloat(trade.price).toFixed(4)}`);
          console.log(`     Market: ${trade.market.question}`);
          if (trade.transactionHash) {
            console.log(`     TX: ${trade.transactionHash}`);
          }
        });
      }

      if (status.openPositions.length > 0) {
        console.log(`\nOpen Positions (${status.openPositions.length}):`);
        status.openPositions.forEach((position, index) => {
          const value = parseFloat(position.value);
          console.log(`  ${index + 1}. ${position.outcome}`);
          console.log(`     Quantity: ${position.quantity}`);
          console.log(`     Price: $${parseFloat(position.price).toFixed(4)}`);
          console.log(`     Value: $${value.toFixed(2)}`);
          console.log(`     Market: ${position.market.question.substring(0, 60)}...`);
        });
      } else {
        console.log('\nNo open positions');
      }
    },
    onError: (error) => {
      console.error('Error occurred:', error.message);
    },
  });

  try {
    await monitor.start();
    console.log('Monitor started successfully');
  } catch (error: any) {
    console.error('Failed to start monitor:', error.message);
  }
}

main();
