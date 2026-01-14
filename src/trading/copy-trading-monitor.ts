import { AccountMonitor } from '../monitor/account-monitor';
import { PolymarketClient } from '../api/polymarket-client';
import { TradeExecutor } from './trade-executor';
import { Position, TradingStatus, MonitorOptions, CopyTradingConfig, CopyTradingStatus } from '../types';

/**
 * Copy Trading Monitor
 * Wraps AccountMonitor and executes trades to copy the target account's positions
 */
export class CopyTradingMonitor {
  private accountMonitor: AccountMonitor;
  private tradeExecutor: TradeExecutor;
  private config: CopyTradingConfig;
  private stats: CopyTradingStatus;
  private executedPositions: Set<string> = new Set(); // Track positions we've already executed
  private targetPositions: Map<string, Position> = new Map(); // Track target's current positions
  private targetAddress: string;

  constructor(
    client: PolymarketClient,
    monitorOptions: MonitorOptions,
    copyTradingConfig: CopyTradingConfig
  ) {
    this.config = copyTradingConfig;
    this.targetAddress = monitorOptions.targetAddress;
    
    // Initialize trade executor
    this.tradeExecutor = new TradeExecutor(copyTradingConfig);
    
    // Initialize statistics
    this.stats = {
      enabled: copyTradingConfig.enabled,
      dryRun: copyTradingConfig.dryRun ?? false,
      totalTradesExecuted: 0,
      totalTradesFailed: 0,
      totalVolume: '0',
    };

    // Create account monitor with custom update handler
    this.accountMonitor = new AccountMonitor(client, {
      ...monitorOptions,
      onUpdate: (status: TradingStatus) => {
        // Call original callback if provided
        if (monitorOptions.onUpdate) {
          monitorOptions.onUpdate(status);
        }
        
        // Execute copy trading logic
        if (this.config.enabled) {
          this.handleStatusUpdate(status);
        }
      },
      onError: (error: Error) => {
        // Call original error handler if provided
        if (monitorOptions.onError) {
          monitorOptions.onError(error);
        }
        
        console.error('Copy trading monitor error:', error);
      },
    });
  }

  /**
   * Start monitoring and copy trading
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('⚠️  Copy trading is disabled. Starting monitor only...');
      await this.accountMonitor.start();
      return;
    }

    console.log('🚀 Starting copy trading monitor...');
    console.log(`📊 Target address: ${this.targetAddress}`);
    console.log(`👛 Trading wallet: ${this.tradeExecutor.getWalletAddress()}`);
    
    if (this.config.dryRun) {
      console.log('🔍 DRY RUN MODE: No actual trades will be executed');
    } else {
      console.log('✅ LIVE MODE: Trades will be executed');
    }

    // Initialize trade executor
    try {
      await this.tradeExecutor.initialize();
    } catch (error: any) {
      console.error('Failed to initialize trade executor:', error.message);
      if (!this.config.dryRun) {
        throw error;
      }
    }

    // Start monitoring
    await this.accountMonitor.start();
    console.log('✅ Copy trading monitor started');
  }

  /**
   * Stop monitoring and copy trading
   */
  stop(): void {
    this.accountMonitor.stop();
    console.log('🛑 Copy trading monitor stopped');
  }

  /**
   * Handle status updates and execute copy trades
   */
  private async handleStatusUpdate(status: TradingStatus): Promise<void> {
    const currentPositions = new Map<string, Position>();
    status.openPositions.forEach(pos => {
      currentPositions.set(pos.id, pos);
    });

    // Detect new positions (positions in current but not in target)
    const newPositions: Position[] = [];
    for (const [id, position] of currentPositions) {
      if (!this.targetPositions.has(id)) {
        newPositions.push(position);
      }
    }

    // Detect closed positions (positions in target but not in current)
    const closedPositions: Position[] = [];
    for (const [id, position] of this.targetPositions) {
      if (!currentPositions.has(id)) {
        closedPositions.push(position);
      }
    }

    // Execute buy orders for new positions
    for (const position of newPositions) {
      // Skip if we already executed this position
      if (this.executedPositions.has(position.id)) {
        continue;
      }

      try {
        console.log(`\n🆕 New position detected: ${position.market.question}`);
        console.log(`   Outcome: ${position.outcome}`);
        console.log(`   Quantity: ${position.quantity} shares @ $${position.price}`);
        
        const result = await this.tradeExecutor.executeBuy(position);
        
        if (result.success) {
          this.executedPositions.add(position.id);
          this.stats.totalTradesExecuted++;
          const tradeValue = parseFloat(result.executedQuantity || '0') * parseFloat(result.executedPrice || '0');
          this.stats.totalVolume = (parseFloat(this.stats.totalVolume) + tradeValue).toFixed(2);
          this.stats.lastTradeTime = new Date().toISOString();
        } else {
          this.stats.totalTradesFailed++;
          console.error(`Failed to execute buy order: ${result.error}`);
        }
      } catch (error: any) {
        this.stats.totalTradesFailed++;
        console.error(`Error executing buy order:`, error.message);
      }
    }

    // Execute sell orders for closed positions
    for (const position of closedPositions) {
      // Only sell if we previously bought this position
      if (!this.executedPositions.has(position.id)) {
        continue;
      }

      try {
        console.log(`\n❌ Position closed: ${position.market.question}`);
        console.log(`   Outcome: ${position.outcome}`);
        console.log(`   Quantity: ${position.quantity} shares @ $${position.price}`);
        
        const result = await this.tradeExecutor.executeSell(position);
        
        if (result.success) {
          // Remove from executed positions (position is closed)
          this.executedPositions.delete(position.id);
          this.stats.totalTradesExecuted++;
          const tradeValue = parseFloat(result.executedQuantity || '0') * parseFloat(result.executedPrice || '0');
          this.stats.totalVolume = (parseFloat(this.stats.totalVolume) + tradeValue).toFixed(2);
          this.stats.lastTradeTime = new Date().toISOString();
        } else {
          this.stats.totalTradesFailed++;
          console.error(`Failed to execute sell order: ${result.error}`);
        }
      } catch (error: any) {
        this.stats.totalTradesFailed++;
        console.error(`Error executing sell order:`, error.message);
      }
    }

    // Update target positions map
    this.targetPositions = currentPositions;
  }

  /**
   * Get copy trading statistics
   */
  getStats(): CopyTradingStatus {
    return { ...this.stats };
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this.accountMonitor.isRunning();
  }

  /**
   * Get account monitor instance
   */
  getAccountMonitor(): AccountMonitor {
    return this.accountMonitor;
  }

  /**
   * Get trade executor instance
   */
  getTradeExecutor(): TradeExecutor {
    return this.tradeExecutor;
  }
}
