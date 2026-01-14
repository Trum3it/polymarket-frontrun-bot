/**
 * Copy Trading Example
 * This example demonstrates how to set up copy trading on Polymarket
 */

import { CopyTradingMonitor, PolymarketClient } from '../src';

async function main() {
  // Configuration
  const targetAddress = process.env.TARGET_ADDRESS || '';
  const privateKey = process.env.PRIVATE_KEY || '';

  if (!targetAddress) {
    console.error('❌ Please set TARGET_ADDRESS environment variable');
    console.log('Usage: TARGET_ADDRESS=0x... PRIVATE_KEY=0x... npm run example:copy-trading');
    process.exit(1);
  }

  if (!privateKey) {
    console.error('❌ Please set PRIVATE_KEY environment variable');
    console.log('⚠️  WARNING: Never share your private key!');
    process.exit(1);
  }

  // Create API client
  const client = new PolymarketClient({
    // Optional: Add API key if required
    // apiKey: process.env.POLYMARKET_API_KEY,
  });

  // Create copy trading monitor
  const copyTradingMonitor = new CopyTradingMonitor(
    client,
    {
      targetAddress,
      pollInterval: 30000, // Poll every 30 seconds
      onUpdate: (status) => {
        // Display status updates
        const monitor = copyTradingMonitor.getAccountMonitor();
        console.log(monitor.getFormattedStatus(status));
      },
      onError: (error) => {
        console.error('Monitor error:', error.message);
      },
    },
    {
      enabled: true,
      privateKey,
      dryRun: process.env.DRY_RUN === 'true', // Set DRY_RUN=true to simulate trades
      positionSizeMultiplier: parseFloat(process.env.POSITION_SIZE_MULTIPLIER || '1.0'),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '10000'), // $10,000 max per position
      maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE || '5000'), // $5,000 max per trade
      minTradeSize: parseFloat(process.env.MIN_TRADE_SIZE || '1'), // $1 minimum
      slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '1.0'), // 1% slippage
      onTradeExecuted: (result) => {
        console.log('\n✅ Trade executed:', {
          success: result.success,
          orderId: result.orderId,
          quantity: result.executedQuantity,
          price: result.executedPrice,
          market: result.position.market.question,
        });
      },
      onTradeError: (error, position) => {
        console.error('\n❌ Trade error:', {
          error: error.message,
          market: position.market.question,
        });
      },
    }
  );

  // Start copy trading
  console.log('\n🚀 Starting copy trading bot...');
  console.log(`📊 Target address: ${targetAddress}`);
  console.log(`👛 Trading wallet: ${copyTradingMonitor.getTradeExecutor().getWalletAddress()}`);
  console.log(`🔍 Dry run mode: ${process.env.DRY_RUN === 'true' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`💰 Position size multiplier: ${process.env.POSITION_SIZE_MULTIPLIER || '1.0'}x\n`);

  try {
    await copyTradingMonitor.start();
    console.log('✅ Copy trading bot started successfully!\n');
  } catch (error: any) {
    console.error('❌ Failed to start copy trading bot:', error.message);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down copy trading bot...');
    const stats = copyTradingMonitor.getStats();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total trades executed: ${stats.totalTradesExecuted}`);
    console.log(`   Total trades failed: ${stats.totalTradesFailed}`);
    console.log(`   Total volume: $${stats.totalVolume}`);
    copyTradingMonitor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutting down copy trading bot...');
    copyTradingMonitor.stop();
    process.exit(0);
  });
}

main().catch(console.error);
