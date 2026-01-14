import { PolymarketClient } from '../api/polymarket-client';
import {
  TradingStatus,
  MonitorOptions,
  Position,
  Trade,
} from '../types';

/**
 * Polymarket Account Monitor
 * Monitors a target account's trading status and provides real-time updates
 */
export class AccountMonitor {
  private client: PolymarketClient;
  private options: Required<MonitorOptions>;
  private pollIntervalId?: NodeJS.Timeout;
  private isMonitoring: boolean = false;
  private lastStatus?: TradingStatus;
  private lastPollTime?: number;

  constructor(client: PolymarketClient, options: MonitorOptions) {
    this.client = client;
    this.options = {
      pollInterval: options.pollInterval || 30000, // Default 30 seconds
      enableWebSocket: options.enableWebSocket || false,
      onUpdate: options.onUpdate || (() => {}),
      onError: options.onError || ((error) => console.error('Monitor error:', error)),
      targetAddress: options.targetAddress,
    };

    if (!this.options.targetAddress) {
      throw new Error('Target address is required');
    }
  }

  /**
   * Start monitoring the target account
   */
  async start(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Monitor is already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`Starting monitor for address: ${this.options.targetAddress}`);
    console.log(`Polling interval: ${this.options.pollInterval / 1000} seconds`);

    // Initial fetch
    await this.updateStatus();

    // Start polling
    this.pollIntervalId = setInterval(
      () => this.updateStatus(),
      this.options.pollInterval
    );
    
    console.log(`✅ Monitor started. Watching for new positions...`);

    if (this.options.enableWebSocket) {
      // WebSocket monitoring would be implemented here
      // For now, we use polling
      console.log('WebSocket monitoring not yet implemented, using polling');
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = undefined;
    }
    console.log('Monitor stopped');
  }

  /**
   * Get current trading status
   */
  async getStatus(): Promise<TradingStatus> {
    try {
      // Only fetch positions (trades not needed)
      const positionsResult = await Promise.allSettled([
        this.client.getUserPositions(this.options.targetAddress),
      ]);

      // Extract positions (handle both success and failure)
      const positions = positionsResult[0].status === 'fulfilled' 
        ? positionsResult[0].value 
        : {
            user: this.options.targetAddress,
            positions: [],
            totalValue: '0',
            timestamp: new Date().toISOString(),
          };

      // Log warnings for failures
      if (positionsResult[0].status === 'rejected') {
        console.warn('Failed to fetch positions:', positionsResult[0].reason?.message || 'Unknown error');
      }

      const status: TradingStatus = {
        user: this.options.targetAddress,
        totalPositions: positions.positions.length,
        totalValue: positions.totalValue,
        recentTrades: [], // Not fetching trades anymore
        openPositions: positions.positions,
        lastUpdated: new Date().toISOString(),
      };

      return status;
    } catch (error: any) {
      this.options.onError(error);
      throw error;
    }
  }

  /**
   * Update status and notify if there are changes
   */
  private async updateStatus(): Promise<void> {
    try {
      const status = await this.getStatus();
      const hasChanges = this.detectChanges(status);

      // Always log polling activity (every 10 polls to avoid spam)
      const now = Date.now();
      if (!this.lastPollTime || (now - this.lastPollTime) > 10000) {
        console.log(`[${new Date().toLocaleTimeString()}] Polling... Found ${status.openPositions.length} positions`);
        this.lastPollTime = now;
      }

      if (hasChanges || !this.lastStatus) {
        // Log what changed for debugging
        if (this.lastStatus && hasChanges) {
          const newPositions = status.openPositions.filter(
            p => !this.lastStatus!.openPositions.some(lp => lp.id === p.id)
          );
          const removedPositions = this.lastStatus.openPositions.filter(
            lp => !status.openPositions.some(p => p.id === lp.id)
          );
          
          // Check for updated positions (same ID but different quantity only)
          const updatedPositions: Array<{position: Position, oldQty: string, newQty: string}> = [];
          status.openPositions.forEach(currentPos => {
            const lastPos = this.lastStatus!.openPositions.find(lp => lp.id === currentPos.id);
            if (lastPos) {
              const currentQty = parseFloat(currentPos.quantity);
              const lastQty = parseFloat(lastPos.quantity);
              
              // Check if quantity changed significantly
              if (Math.abs(currentQty - lastQty) > Math.max(1, lastQty * 0.01)) {
                updatedPositions.push({
                  position: currentPos,
                  oldQty: lastPos.quantity,
                  newQty: currentPos.quantity
                });
              }
            }
          });
          
          if (newPositions.length > 0) {
            console.log(`\n🆕 NEW POSITION DETECTED! (${newPositions.length} new position(s))`);
            newPositions.forEach(pos => {
              console.log(`   - ${pos.outcome}: ${pos.quantity} shares @ $${pos.price} (${pos.market.question.substring(0, 50)}...)`);
            });
          }
          
          if (updatedPositions.length > 0) {
            console.log(`\n📊 POSITION UPDATED! (${updatedPositions.length} position(s) changed)`);
            updatedPositions.forEach(({position, oldQty, newQty}) => {
              const qtyChange = parseFloat(newQty) - parseFloat(oldQty);
              const qtyChangeStr = qtyChange > 0 ? `+${qtyChange.toFixed(2)}` : qtyChange.toFixed(2);
              console.log(`   - ${position.outcome}: ${oldQty} → ${newQty} shares (${qtyChangeStr})`);
              console.log(`     Market: ${position.market.question.substring(0, 50)}...`);
            });
          }
          
          if (removedPositions.length > 0) {
            console.log(`\n❌ POSITION CLOSED (${removedPositions.length} position(s) removed)`);
            removedPositions.forEach(pos => {
              const value = parseFloat(pos.value);
              const valueStr = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              console.log(`   - ${pos.outcome}: ${pos.quantity} shares @ $${pos.price} (Value: $${valueStr})`);
              console.log(`     Market: ${pos.market.question || 'Unknown Market'}`);
            });
          }
          
          if (status.openPositions.length !== this.lastStatus.openPositions.length) {
            console.log(`   Position count changed: ${this.lastStatus.openPositions.length} → ${status.openPositions.length}`);
          }
        }
        
        this.lastStatus = status;
        this.options.onUpdate(status);
      }
    } catch (error: any) {
      console.error(`[${new Date().toLocaleTimeString()}] Error during update:`, error.message);
      this.options.onError(error);
    }
  }

  /**
   * Detect if there are significant changes in the status
   * Specifically checks for new positions being added or existing positions being updated
   */
  private detectChanges(status: TradingStatus): boolean {
    if (!this.lastStatus) {
      return true;
    }

    // Check for position count changes (new positions added or removed)
    if (status.openPositions.length !== this.lastStatus.openPositions.length) {
      console.log(`[DEBUG] Position count changed: ${this.lastStatus.openPositions.length} → ${status.openPositions.length}`);
      return true;
    }

    // Create maps for easier lookup
    const currentPositionsMap = new Map(status.openPositions.map(p => [p.id, p]));
    const lastPositionsMap = new Map(this.lastStatus.openPositions.map(p => [p.id, p]));
    
    // Check for new positions by comparing IDs
    for (const [id, currentPos] of currentPositionsMap) {
      if (!lastPositionsMap.has(id)) {
        console.log(`[DEBUG] New position ID detected: ${id.substring(0, 20)}...`);
        return true; // New position detected!
      }
      
      // Check if existing position was significantly updated (quantity changes only)
      const lastPos = lastPositionsMap.get(id)!;
      const currentQty = parseFloat(currentPos.quantity);
      const lastQty = parseFloat(lastPos.quantity);
      
      // Detect quantity changes (more than 1% or absolute change > 1)
      if (Math.abs(currentQty - lastQty) > Math.max(1, lastQty * 0.01)) {
        console.log(`[DEBUG] Position quantity changed: ${id.substring(0, 20)}... ${lastQty.toFixed(2)} → ${currentQty.toFixed(2)}`);
        return true;
      }
    }

    // Check if any positions were removed
    for (const id of lastPositionsMap.keys()) {
      if (!currentPositionsMap.has(id)) {
        console.log(`[DEBUG] Position removed: ${id.substring(0, 20)}...`);
        return true; // Position closed/removed
      }
    }

    // Check for value changes in existing positions (more than 1% difference)
    const lastValue = parseFloat(this.lastStatus.totalValue);
    const currentValue = parseFloat(status.totalValue);
    if (Math.abs(currentValue - lastValue) / Math.max(lastValue, 0.01) > 0.01) {
      console.log(`[DEBUG] Total value changed: $${lastValue} → $${currentValue}`);
      return true;
    }

    return false;
  }

  /**
   * Get formatted status string for display (simplified, user-friendly)
   */
  getFormattedStatus(status: TradingStatus): string {
    const lines = [
      `\n╔══════════════════════════════════════════════════════════╗`,
      `║     Polymarket Account Monitor - Open Positions          ║`,
      `╚══════════════════════════════════════════════════════════╝`,
      `👤 Account: ${status.user.substring(0, 10)}...${status.user.substring(status.user.length - 8)}`,
      `🕐 Last Updated: ${new Date(status.lastUpdated).toLocaleString()}`,
    ];

    // Currently open/active positions - show top 10
    if (status.openPositions.length > 0) {
      const displayCount = Math.min(10, status.openPositions.length);
      lines.push(`\n💼 Currently Open Positions (showing ${displayCount} of ${status.openPositions.length} total):`);
      status.openPositions.slice(0, 10).forEach((position, index) => {
        const outcome = position.outcome;
        const quantity = parseFloat(position.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 });
        const price = parseFloat(position.price).toFixed(4);
        const value = parseFloat(position.value);
        const valueStr = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const marketTitle = position.market.question || 'Unknown Market';
        const shortTitle = marketTitle.length > 50 ? marketTitle.substring(0, 47) + '...' : marketTitle;
        
        lines.push(
          `   ${index + 1}. ${outcome}: ${quantity} shares @ $${price}`
        );
        
        // Show initial value if current value is 0
        if (value === 0 && position.initialValue) {
          const initialValue = parseFloat(position.initialValue);
          const initialValueStr = initialValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          lines.push(`      Current Value: $${valueStr} (Initial: $${initialValueStr})`);
        } else {
          lines.push(`      Current Value: $${valueStr}`);
        }
        
        lines.push(`      Market: ${shortTitle}`);
      });
    } else {
      lines.push(`\n💼 Currently Open Positions: No active positions`);
    }

    lines.push(`\n╚══════════════════════════════════════════════════════════╝\n`);

    return lines.join('\n');
  }

  /**
   * Check if monitor is currently running
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }
}
