import axios, { AxiosInstance } from 'axios';
import {
  Market,
  Position,
  Trade,
  UserPositions,
  UserTrades,
  PolymarketConfig,
} from '../types';

/**
 * Polymarket API Client
 * Handles communication with Polymarket's various APIs
 */
export class PolymarketClient {
  private client: AxiosInstance;
  private config: PolymarketConfig;
  private marketCache: Map<string, Market> = new Map();

  constructor(config: PolymarketConfig = {}) {
    this.config = {
      baseUrl: 'https://clob.polymarket.com',
      dataApiUrl: 'https://data-api.polymarket.com',
      gammaApiUrl: 'https://gamma-api.polymarket.com',
      clobApiUrl: 'https://clob.polymarket.com',
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.dataApiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
      timeout: 30000,
    });
  }

  /**
   * Get user positions for a specific address
   */
  async getUserPositions(userAddress: string): Promise<UserPositions> {
    try {
      // Try multiple possible endpoint formats
      let positions: Position[] = [];
      
      try {
        // Primary endpoint format - try to get all positions (check for pagination)
        let allPositions: any[] = [];
        let hasMore = true;
        let page = 0;
        const limit = 100; // API might limit to 100 per page
        
        while (hasMore && page < 10) { // Limit to 10 pages to avoid infinite loops
          const response = await this.client.get(`/users/${userAddress}/positions`, {
            params: {
              active: true,
              limit: limit,
              offset: page * limit,
              ...(page > 0 && { page: page }),
            },
          });
          
          const pagePositions = response.data.positions || response.data?.data || response.data || [];
          
          if (Array.isArray(pagePositions)) {
            allPositions = allPositions.concat(pagePositions);
            
            // Check if we got fewer results than limit (last page)
            if (pagePositions.length < limit) {
              hasMore = false;
            } else {
              page++;
              // Log pagination if fetching multiple pages
              if (page === 1 && process.env.DEBUG) {
                console.log(`[DEBUG] Fetching positions page ${page + 1}... (found ${allPositions.length} so far)`);
              }
            }
          } else {
            // If response is not an array, it might be the full result
            allPositions = pagePositions;
            hasMore = false;
          }
        }
        
        positions = allPositions;
        
        // Log if we hit the pagination limit
        if (page >= 10 && hasMore && process.env.DEBUG) {
          console.log(`[WARNING] Hit pagination limit (10 pages). There may be more than ${allPositions.length} positions.`);
        }
      } catch (primaryError: any) {
        // Try alternative endpoint format (GraphQL or different structure)
        try {
          let allPositions: any[] = [];
          let hasMore = true;
          let page = 0;
          const limit = 100;
          
          while (hasMore && page < 10) {
            const altResponse = await this.client.get(`/positions`, {
              params: {
                user: userAddress,
                active: true,
                limit: limit,
                offset: page * limit,
                ...(page > 0 && { page: page }),
              },
            });
            
            const pagePositions = altResponse.data.positions || altResponse.data?.data || altResponse.data || [];
            
            if (Array.isArray(pagePositions)) {
              allPositions = allPositions.concat(pagePositions);
              if (pagePositions.length < limit) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              allPositions = pagePositions;
              hasMore = false;
            }
          }
          
          positions = allPositions;
        } catch (altError: any) {
          // If both fail, check if it's a 404 (no positions) or actual error
          if (primaryError.response?.status === 404 || altError.response?.status === 404) {
            return {
              user: userAddress,
              positions: [],
              totalValue: '0',
              timestamp: new Date().toISOString(),
            };
          }
          throw primaryError;
        }
      }
      
      const positionsArray = Array.isArray(positions) ? positions : [];
      const normalizedPositions = this.normalizePositions(positionsArray);
      
      return {
        user: userAddress,
        positions: normalizedPositions,
        totalValue: this.calculateTotalValue(normalizedPositions),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        // User has no positions
        return {
          user: userAddress,
          positions: [],
          totalValue: '0',
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error(`Failed to fetch user positions: ${error.message}`);
    }
  }

  /**
   * Get user trade history
   */
  async getUserTrades(userAddress: string, limit: number = 50): Promise<UserTrades> {
    try {
      // Try multiple possible endpoint formats
      let trades: Trade[] = [];
      
      try {
        // Primary endpoint format
        const response = await this.client.get(`/users/${userAddress}/trades`, {
          params: {
            limit,
            sort: 'desc',
          },
        });
        
        // Log response structure for debugging
        if (process.env.DEBUG) {
          console.log('API Response structure:', {
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : [],
            isArray: Array.isArray(response.data),
          });
        }
        
        trades = response.data.trades || response.data?.data || response.data || [];
        
        // Log first trade item structure for debugging
        if (process.env.DEBUG && Array.isArray(trades) && trades.length > 0) {
          console.log('\n=== First Trade Item Structure ===');
          console.log(JSON.stringify(trades[0], null, 2));
          console.log('===================================\n');
        }
        
        // Ensure it's an array
        if (!Array.isArray(trades)) {
          console.warn('API returned non-array trades data, converting...');
          trades = [];
        }
      } catch (primaryError: any) {
        // Try alternative endpoint format
        try {
          const altResponse = await this.client.get(`/trades`, {
            params: {
              user: userAddress,
              limit,
              sort: 'desc',
            },
          });
          
          trades = altResponse.data.trades || altResponse.data?.data || altResponse.data || [];
          
          if (!Array.isArray(trades)) {
            trades = [];
          }
        } catch (altError: any) {
          // If both fail, check if it's a 404 (no trades) or actual error
          if (primaryError.response?.status === 404 || altError.response?.status === 404) {
            return {
              user: userAddress,
              trades: [],
              totalTrades: 0,
              timestamp: new Date().toISOString(),
            };
          }
          throw primaryError;
        }
      }

      // Ensure trades is an array and log for debugging
      const tradesArray = Array.isArray(trades) ? trades : [];
      const normalizedTrades = this.normalizeTrades(tradesArray);

      return {
        user: userAddress,
        trades: normalizedTrades,
        totalTrades: normalizedTrades.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // Log the actual error for debugging
      if (process.env.DEBUG) {
        console.error('Error fetching trades:', error.response?.data || error.message);
      }
      
      if (error.response?.status === 404) {
        return {
          user: userAddress,
          trades: [],
          totalTrades: 0,
          timestamp: new Date().toISOString(),
        };
      }
      
      // If it's a normalization error, return empty trades instead of throwing
      if (error.message?.includes('Cannot read properties')) {
        console.warn('Warning: Error normalizing trade data, returning empty trades');
        return {
          user: userAddress,
          trades: [],
          totalTrades: 0,
          timestamp: new Date().toISOString(),
        };
      }
      
      throw new Error(`Failed to fetch user trades: ${error.message}`);
    }
  }

  /**
   * Get market information by market ID
   */
  async getMarket(marketId: string): Promise<Market> {
    if (!marketId) {
      return this.normalizeMarket({});
    }

    // Check cache first
    if (this.marketCache.has(marketId)) {
      return this.marketCache.get(marketId)!;
    }

    try {
      // Try multiple possible endpoints
      let marketData: any = null;
      
      try {
        // Try Gamma API first (usually has better market data)
        const gammaClient = axios.create({
          baseURL: this.config.gammaApiUrl,
          timeout: 30000,
        });
        
        // Try different Gamma API endpoint formats
        try {
          const gammaResponse = await gammaClient.get(`/markets/${marketId}`);
          marketData = gammaResponse.data;
        } catch (e1: any) {
          try {
            // Try with condition ID format
            const gammaResponse2 = await gammaClient.get(`/events`, {
              params: { conditionId: marketId },
            });
            if (gammaResponse2.data && gammaResponse2.data.length > 0) {
              marketData = gammaResponse2.data[0];
            }
          } catch (e2: any) {
            // Try markets endpoint
            const gammaResponse3 = await gammaClient.get(`/markets`, {
              params: { id: marketId },
            });
            if (gammaResponse3.data && Array.isArray(gammaResponse3.data) && gammaResponse3.data.length > 0) {
              marketData = gammaResponse3.data[0];
            } else if (gammaResponse3.data && !Array.isArray(gammaResponse3.data)) {
              marketData = gammaResponse3.data;
            }
          }
        }
      } catch (gammaError: any) {
        // Try Data API
        try {
          const response = await this.client.get(`/markets/${marketId}`);
          marketData = response.data;
        } catch (dataApiError: any) {
          // Try CLOB API
          try {
            const clobClient = axios.create({
              baseURL: this.config.clobApiUrl,
              timeout: 30000,
            });
            const clobResponse = await clobClient.get(`/markets/${marketId}`);
            marketData = clobResponse.data;
          } catch (clobError: any) {
            // If all fail, return default market with ID
            const defaultMarket = this.normalizeMarket({ id: marketId, marketId: marketId });
            this.marketCache.set(marketId, defaultMarket);
            return defaultMarket;
          }
        }
      }
      
      const normalizedMarket = this.normalizeMarket(marketData || { id: marketId });
      this.marketCache.set(marketId, normalizedMarket);
      return normalizedMarket;
    } catch (error: any) {
      // Return market with at least the ID
      const defaultMarket = this.normalizeMarket({ id: marketId, marketId: marketId });
      this.marketCache.set(marketId, defaultMarket);
      return defaultMarket;
    }
  }

  /**
   * Get multiple markets
   */
  async getMarkets(marketIds: string[]): Promise<Market[]> {
    try {
      const promises = marketIds.map(id => this.getMarket(id).catch(() => null));
      const results = await Promise.all(promises);
      return results.filter((m): m is Market => m !== null);
    } catch (error: any) {
      throw new Error(`Failed to fetch markets: ${error.message}`);
    }
  }

  /**
   * Enrich trades with market data by fetching market details
   */
  private async enrichWithMarketData(trades: Trade[]): Promise<Trade[]> {
    // Extract unique market IDs
    const marketIds = new Set<string>();
    trades.forEach(trade => {
      if (trade.market.id) {
        marketIds.add(trade.market.id);
      }
    });

    // Fetch market data for all unique IDs (with caching)
    const marketPromises = Array.from(marketIds).map(async (marketId) => {
      if (this.marketCache.has(marketId)) {
        return this.marketCache.get(marketId)!;
      }
      try {
        const market = await this.getMarket(marketId);
        this.marketCache.set(marketId, market);
        return market;
      } catch (error) {
        // Return cached or default market
        return this.marketCache.get(marketId) || this.normalizeMarket({ id: marketId });
      }
    });

    const markets = await Promise.all(marketPromises);
    const marketMap = new Map<string, Market>();
    markets.forEach(market => {
      if (market.id) {
        marketMap.set(market.id, market);
      }
    });

    // Update trades with enriched market data
    return trades.map(trade => {
      if (trade.market.id && marketMap.has(trade.market.id)) {
        return {
          ...trade,
          market: marketMap.get(trade.market.id)!,
        };
      }
      return trade;
    });
  }

  /**
   * Enrich positions with market data by fetching market details
   */
  private async enrichPositionsWithMarketData(positions: Position[]): Promise<Position[]> {
    // Extract unique market IDs
    const marketIds = new Set<string>();
    positions.forEach(position => {
      if (position.market.id) {
        marketIds.add(position.market.id);
      }
    });

    // Fetch market data for all unique IDs (with caching)
    const marketPromises = Array.from(marketIds).map(async (marketId) => {
      if (this.marketCache.has(marketId)) {
        return this.marketCache.get(marketId)!;
      }
      try {
        const market = await this.getMarket(marketId);
        this.marketCache.set(marketId, market);
        return market;
      } catch (error) {
        // Return cached or default market
        return this.marketCache.get(marketId) || this.normalizeMarket({ id: marketId });
      }
    });

    const markets = await Promise.all(marketPromises);
    const marketMap = new Map<string, Market>();
    markets.forEach(market => {
      if (market.id) {
        marketMap.set(market.id, market);
      }
    });

    // Update positions with enriched market data
    return positions.map(position => {
      if (position.market.id && marketMap.has(position.market.id)) {
        return {
          ...position,
          market: marketMap.get(position.market.id)!,
        };
      }
      return position;
    });
  }

  /**
   * Normalize position data from API response
   */
  private normalizePositions(data: any[]): Position[] {
    return data
      .filter((item: any) => item != null)
      .map((item: any) => {
        // Extract market data directly from the item (API already includes it!)
        const marketData = {
          id: item.conditionId || item.market_id || item.marketId || '',
          question: item.title || item.question || '',
          slug: item.slug || '',
          icon: item.icon || '',
          eventSlug: item.eventSlug || '',
          endDate: item.endDate || '',
        };
        
        // Calculate current value from the position data
        // Priority: currentValue > (size * curPrice) > initialValue > (size * avgPrice)
        let currentValue: string;
        const size = parseFloat(item.size || item.quantity || '0');
        const curPrice = parseFloat(item.curPrice || item.currentPrice || '0');
        const avgPrice = parseFloat(item.avgPrice || item.price || '0');
        
        if (item.currentValue !== undefined && item.currentValue !== null && item.currentValue !== 0) {
          // Use API's currentValue if it's not 0
          currentValue = String(item.currentValue);
        } else if (curPrice > 0 && size > 0) {
          // Calculate from size * current price
          currentValue = String(size * curPrice);
        } else if (item.initialValue !== undefined && item.initialValue !== null && item.initialValue > 0) {
          // Fallback to initial value
          currentValue = String(item.initialValue);
        } else if (avgPrice > 0 && size > 0) {
          // Calculate from size * average price (cost basis)
          currentValue = String(size * avgPrice);
        } else {
          // Last resort: use calculatePositionValue
          currentValue = this.calculatePositionValue(item);
        }
        
        // Use current price if available and > 0, otherwise use average price
        const displayPrice = curPrice > 0 ? curPrice : (avgPrice > 0 ? avgPrice : '0');
        
        // Store initial value for display when current value is 0
        const initialValue = item.initialValue !== undefined && item.initialValue !== null
          ? String(item.initialValue)
          : (avgPrice > 0 && size > 0 ? String(size * avgPrice) : undefined);
        
        return {
          id: item.asset || item.id || item.positionId || '',
          market: this.normalizeMarket(marketData),
          outcome: item.outcome || item.outcomeToken || '',
          quantity: String(item.size || item.quantity || '0'),
          price: String(displayPrice),
          value: currentValue,
          initialValue: initialValue,
          timestamp: item.timestamp 
            ? (typeof item.timestamp === 'number' 
                ? new Date(item.timestamp * 1000).toISOString() 
                : item.timestamp)
            : new Date().toISOString(),
        };
      });
  }

  /**
   * Normalize trade data from API response
   */
  private normalizeTrades(data: any[]): Trade[] {
    return data
      .filter((item: any) => item != null) // Filter out null/undefined items
      .map((item: any) => {
        // Extract market data directly from the item (API already includes it!)
        const marketData = {
          id: item.conditionId || item.market_id || item.marketId || '',
          question: item.title || item.question || '',
          slug: item.slug || '',
          icon: item.icon || '',
          eventSlug: item.eventSlug || '',
        };
        
        return {
          id: item.transactionHash || item.id || item.tradeId || `trade-${Date.now()}-${Math.random()}`,
          market: this.normalizeMarket(marketData),
          outcome: item.outcome || item.outcomeToken || '',
          side: (item.side || '').toLowerCase() === 'buy' ? 'buy' : 'sell',
          quantity: String(item.size || item.quantity || item.amount || '0'),
          price: String(item.price || item.executionPrice || item.fillPrice || '0'),
          timestamp: item.timestamp 
            ? (typeof item.timestamp === 'number' 
                ? new Date(item.timestamp * 1000).toISOString() 
                : item.timestamp)
            : new Date().toISOString(),
          transactionHash: item.transactionHash || item.txHash || item.tx,
          user: item.proxyWallet || item.user || item.userAddress || item.account || '',
        };
      });
  }

  /**
   * Normalize market data from API response
   */
  private normalizeMarket(data: any): Market {
    // Handle null/undefined data
    if (!data || typeof data !== 'object') {
      return {
        id: '',
        question: 'Unknown Market',
        slug: '',
        description: undefined,
        endDate: undefined,
        image: undefined,
        icon: undefined,
        resolutionSource: undefined,
        tags: [],
        liquidity: undefined,
        volume: undefined,
        active: true,
      };
    }

    return {
      id: data.id || data.marketId || data.market_id || data.conditionId || '',
      question: data.question || data.title || data.name || 'Unknown Market',
      slug: data.slug || data.slug_id || '',
      description: data.description || data.desc,
      endDate: data.endDate || data.endDateISO || data.end_date,
      image: data.image || data.imageUrl || data.image_url,
      icon: data.icon,
      resolutionSource: data.resolutionSource || data.resolution_source,
      tags: Array.isArray(data.tags) ? data.tags : [],
      liquidity: data.liquidity ? parseFloat(String(data.liquidity)) : undefined,
      volume: data.volume ? parseFloat(String(data.volume)) : undefined,
      active: data.active !== undefined ? Boolean(data.active) : true,
    };
  }

  /**
   * Calculate total value of positions
   */
  private calculateTotalValue(positions: Position[]): string {
    const total = positions.reduce((sum, pos) => {
      const value = parseFloat(pos.value || '0');
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    return total.toFixed(6);
  }

  /**
   * Calculate position value
   */
  private calculatePositionValue(item: any): string {
    const quantity = parseFloat(item.quantity || item.size || '0');
    const price = parseFloat(item.price || item.lastPrice || '0');
    const value = quantity * price;
    return isNaN(value) ? '0' : value.toFixed(6);
  }
}
