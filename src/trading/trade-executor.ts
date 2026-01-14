import { ClobClient, Side, OrderType } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { Position, CopyTradingConfig, TradeExecutionResult } from '../types';

/**
 * Trade Executor
 * Handles execution of trades on Polymarket using the CLOB API
 */
export class TradeExecutor {
  private client: ClobClient;
  private config: Required<CopyTradingConfig>;
  private apiKeyCreated: boolean = false;
  private walletAddress?: string;

  constructor(config: CopyTradingConfig) {
    this.config = {
      enabled: config.enabled,
      privateKey: config.privateKey,
      dryRun: config.dryRun ?? false,
      positionSizeMultiplier: config.positionSizeMultiplier ?? 1.0,
      maxPositionSize: config.maxPositionSize ?? Infinity,
      maxTradeSize: config.maxTradeSize ?? Infinity,
      slippageTolerance: config.slippageTolerance ?? 1.0,
      minTradeSize: config.minTradeSize ?? 1.0,
      chainId: config.chainId ?? 137, // Polygon mainnet
      clobHost: config.clobHost ?? 'https://clob.polymarket.com',
      onTradeExecuted: config.onTradeExecuted ?? (() => {}),
      onTradeError: config.onTradeError ?? (() => {}),
    };

    // Create wallet from private key
    const wallet = new Wallet(this.config.privateKey);
    this.walletAddress = wallet.address;

    // Initialize CLOB client
    this.client = new ClobClient(this.config.clobHost, this.config.chainId, wallet as any);
  }

  /**
   * Initialize the executor by creating/deriving API key
   */
  async initialize(): Promise<void> {
    if (this.config.dryRun) {
      console.log('🔍 DRY RUN MODE: Trade execution disabled');
      return;
    }

    try {
      console.log('🔑 Initializing trade executor...');
      await this.client.createOrDeriveApiKey();
      this.apiKeyCreated = true;
      console.log(`✅ Trade executor initialized for wallet: ${this.walletAddress}`);
    } catch (error: any) {
      console.error('❌ Failed to initialize trade executor:', error.message);
      throw new Error(`Failed to initialize trade executor: ${error.message}`);
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.walletAddress || '';
  }

  /**
   * Execute a buy order to copy a position
   */
  async executeBuy(position: Position): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      success: false,
      position,
      dryRun: this.config.dryRun,
    };

    try {
      // Extract token ID from position ID (position.id should be the token ID)
      const tokenId = position.id;
      if (!tokenId) {
        throw new Error('Position ID (token ID) is missing');
      }

      // Calculate trade size
      const baseQuantity = parseFloat(position.quantity);
      const tradeQuantity = baseQuantity * this.config.positionSizeMultiplier;
      const tradePrice = parseFloat(position.price);
      const tradeValue = tradeQuantity * tradePrice;

      // Validate trade size
      if (tradeValue < this.config.minTradeSize) {
        const errorMsg = `Trade size $${tradeValue.toFixed(2)} is below minimum $${this.config.minTradeSize}`;
        result.error = errorMsg;
        this.config.onTradeError(new Error(errorMsg), position);
        return result;
      }

      if (tradeValue > this.config.maxTradeSize) {
        const errorMsg = `Trade size $${tradeValue.toFixed(2)} exceeds maximum $${this.config.maxTradeSize}`;
        result.error = errorMsg;
        this.config.onTradeError(new Error(errorMsg), position);
        return result;
      }

      // Check if position size exceeds maximum
      const positionValue = parseFloat(position.value || '0') * this.config.positionSizeMultiplier;
      if (positionValue > this.config.maxPositionSize) {
        const errorMsg = `Position size $${positionValue.toFixed(2)} exceeds maximum $${this.config.maxPositionSize}`;
        result.error = errorMsg;
        this.config.onTradeError(new Error(errorMsg), position);
        return result;
      }

      if (this.config.dryRun) {
        console.log(`🔍 [DRY RUN] Would execute BUY order:`);
        console.log(`   Token ID: ${tokenId}`);
        console.log(`   Quantity: ${tradeQuantity.toFixed(4)} shares`);
        console.log(`   Price: $${tradePrice.toFixed(4)}`);
        console.log(`   Value: $${tradeValue.toFixed(2)}`);
        console.log(`   Market: ${position.market.question}`);
        
        result.success = true;
        result.executedQuantity = tradeQuantity.toFixed(4);
        result.executedPrice = tradePrice.toFixed(4);
        this.config.onTradeExecuted(result);
        return result;
      }

      // Ensure API key is created
      if (!this.apiKeyCreated) {
        await this.initialize();
      }

      // Execute buy order
      console.log(`🟢 Executing BUY order: ${tradeQuantity.toFixed(4)} shares @ $${tradePrice.toFixed(4)}`);
      const orderResponse = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price: tradePrice,
        size: tradeQuantity,
        side: Side.BUY,
        orderType: OrderType.GTC, // Good-til-cancelled
      } as any);

      result.success = true;
      result.orderId = orderResponse.orderID;
      result.executedQuantity = tradeQuantity.toFixed(4);
      result.executedPrice = tradePrice.toFixed(4);
      
      console.log(`✅ BUY order executed successfully! Order ID: ${orderResponse.orderID}`);
      this.config.onTradeExecuted(result);
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      console.error(`❌ Failed to execute BUY order:`, errorMsg);
      result.error = errorMsg;
      this.config.onTradeError(error, position);
      return result;
    }
  }

  /**
   * Execute a sell order to close a position
   */
  async executeSell(position: Position): Promise<TradeExecutionResult> {
    const result: TradeExecutionResult = {
      success: false,
      position,
      dryRun: this.config.dryRun,
    };

    try {
      // Extract token ID from position ID
      const tokenId = position.id;
      if (!tokenId) {
        throw new Error('Position ID (token ID) is missing');
      }

      // Calculate trade size
      const baseQuantity = parseFloat(position.quantity);
      const tradeQuantity = baseQuantity * this.config.positionSizeMultiplier;
      const tradePrice = parseFloat(position.price);

      if (this.config.dryRun) {
        console.log(`🔍 [DRY RUN] Would execute SELL order:`);
        console.log(`   Token ID: ${tokenId}`);
        console.log(`   Quantity: ${tradeQuantity.toFixed(4)} shares`);
        console.log(`   Price: $${tradePrice.toFixed(4)}`);
        console.log(`   Market: ${position.market.question}`);
        
        result.success = true;
        result.executedQuantity = tradeQuantity.toFixed(4);
        result.executedPrice = tradePrice.toFixed(4);
        this.config.onTradeExecuted(result);
        return result;
      }

      // Ensure API key is created
      if (!this.apiKeyCreated) {
        await this.initialize();
      }

      // Execute sell order
      console.log(`🔴 Executing SELL order: ${tradeQuantity.toFixed(4)} shares @ $${tradePrice.toFixed(4)}`);
      const orderResponse = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price: tradePrice,
        size: tradeQuantity,
        side: Side.SELL,
        orderType: OrderType.GTC as any,
      } as any);

      result.success = true;
      result.orderId = orderResponse.orderID;
      result.executedQuantity = tradeQuantity.toFixed(4);
      result.executedPrice = tradePrice.toFixed(4);
      
      console.log(`✅ SELL order executed successfully! Order ID: ${orderResponse.orderID}`);
      this.config.onTradeExecuted(result);
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      console.error(`❌ Failed to execute SELL order:`, errorMsg);
      result.error = errorMsg;
      this.config.onTradeError(error, position);
      return result;
    }
  }

  /**
   * Check if executor is in dry run mode
   */
  isDryRun(): boolean {
    return this.config.dryRun;
  }
}
