# Complete Guide

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Funding Your Wallet](#funding-your-wallet)
4. [Running the Bot](#running-the-bot)
5. [How It Works](#how-it-works)
6. [Position Tracking](#position-tracking)
7. [Simulation & Backtesting](#simulation--backtesting)
8. [Troubleshooting](#troubleshooting)
9. [Deployment](#deployment)

---

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Polygon wallet with USDC balance
- POL/MATIC for gas fees

### Steps

1. Clone the repository:
```bash
git clone https://github.com/kinexbt/polymarket-trading-bot.git
cd polymarket-trading-bot
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `TARGET_ADDRESSES` | Comma-separated target addresses to frontrun | `0xabc...,0xdef...` |
| `PUBLIC_KEY` | Your Polygon wallet address | `your_wallet_address` |
| `PRIVATE_KEY` | Your wallet private key | `your_private_key` |
| `RPC_URL` | Polygon RPC endpoint (must support pending tx monitoring) | `https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID`|

#### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `FETCH_INTERVAL` | `1` | Polling frequency in seconds |
| `MIN_TRADE_SIZE_USD` | `100` | Minimum trade size to frontrun (USD) |
| `FRONTRUN_SIZE_MULTIPLIER` | `0.5` | Frontrun size as % of target (0.0-1.0) |
| `GAS_PRICE_MULTIPLIER` | `1.2` | Gas price multiplier for priority (e.g., 1.2 = 20% higher) |
| `TRADE_MULTIPLIER` | `1.0` | Legacy: Position size multiplier (kept for compatibility) |
| `RETRY_LIMIT` | `3` | Maximum retry attempts for failed orders |
| `TRADE_AGGREGATION_ENABLED` | `false` | Enable trade aggregation |
| `TRADE_AGGREGATION_WINDOW_SECONDS` | `300` | Time window for aggregating trades (seconds) |
| `USDC_CONTRACT_ADDRESS` | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | USDC contract on Polygon |
| `MONGO_URI` | - | MongoDB connection string (optional) |

### Example `.env` File

```env
TARGET_ADDRESSES=0x1234567890abcdef1234567890abcdef12345678,0xabcdef1234567890abcdef1234567890abcdef12
PUBLIC_KEY=your_wallet_address_here
PRIVATE_KEY=your_privatekey_key_here
RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID
FETCH_INTERVAL=1
MIN_TRADE_SIZE_USD=100
FRONTRUN_SIZE_MULTIPLIER=0.5
GAS_PRICE_MULTIPLIER=1.2
RETRY_LIMIT=3
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

---

## Funding Your Wallet

### Requirements

You need two types of funds on your Polygon wallet:

1. **USDC** - For trading positions
2. **POL/MATIC** - For gas fees

### Steps

1. **Bridge or acquire USDC on Polygon:**
   - Use Polygon Bridge to transfer USDC from Ethereum
   - Or purchase USDC directly on Polygon via DEX
   - Recommended minimum: $100-500 USDC for testing

2. **Fund gas (POL/MATIC):**
   - Ensure you have at least 0.2-1.0 POL/MATIC for gas (frontrunning requires higher gas)
   - You can buy POL/MATIC on exchanges or use Polygon faucets
   - Higher gas balances recommended for competitive frontrunning

3. **Verify funding:**
   - Check your wallet balance on PolygonScan
   - Confirm both USDC and POL/MATIC are present
   - Set `PUBLIC_KEY` in `.env` to this funded address

### Getting RPC URL

**Important:** For frontrunning, you need an RPC endpoint that supports pending transaction monitoring.

You can get a free RPC endpoint from:
- [Infura](https://infura.io) - Free tier available (supports pending tx)
- [Alchemy](https://alchemy.com) - Free tier available (supports pending tx)
- [QuickNode](https://quicknode.com) - Free tier available (supports pending tx)

**Note:** Some free tier RPC providers may have rate limits. For production frontrunning, consider premium providers with WebSocket support.

---

## Running the Bot

### Development Mode

```bash
npm run dev
```

Runs with TypeScript directly using `ts-node`. Useful for development and debugging.

### Production Mode

```bash
npm run build
npm start
```

Compiles TypeScript to JavaScript first, then runs the compiled code. Recommended for production.

### Docker Deployment

**Build and run:**
```bash
docker build -t polymarket-frontrun-bot .
docker run --env-file .env polymarket-frontrun-bot
```

**Using Docker Compose:**
```bash
docker-compose up -d
```

### Cloud Deployment

Set environment variables through your platform's configuration:

- **Render:** Add environment variables in dashboard
- **Fly.io:** `fly secrets set KEY=value`
- **Kubernetes:** Use ConfigMaps and Secrets
- **AWS/GCP/Azure:** Use their respective secret management services

---

## How It Works

### Workflow

1. **Mempool Monitoring** - Bot monitors Polygon mempool for pending transactions to Polymarket contracts
2. **API Monitoring** - Simultaneously polls Polymarket API for recent orders from target addresses (hybrid approach)
3. **Signal Detection** - When pending trades are detected, creates `TradeSignal` objects with transaction details
4. **Frontrun Sizing** - Calculates frontrun size as percentage of target trade:
   - Uses `FRONTRUN_SIZE_MULTIPLIER` (default: 50% of target)
   - Validates sufficient balance
5. **Priority Execution** - Submits market orders with higher gas prices to execute before target transaction
6. **Error Handling** - Retries failed orders up to `RETRY_LIMIT`

### Frontrun Sizing Formula

```
frontrun_size = target_trade_size * FRONTRUN_SIZE_MULTIPLIER
```

Example: If target trade is $1000 and multiplier is 0.5, frontrun size is $500.

### Gas Price Strategy

The bot uses a gas price multiplier to ensure priority execution:
```
your_gas_price = target_gas_price * GAS_PRICE_MULTIPLIER
```

Default multiplier is 1.2 (20% higher), ensuring your transaction is prioritized in the mempool.

### Order Types

- **FOK (Fill-or-Kill)** - Order must fill completely or be cancelled
- Orders are placed at best available price (market orders)
- Gas prices are automatically adjusted for priority execution

---

## Position Tracking

### Current Implementation

The bot automatically:
- Tracks processed transaction hashes to avoid duplicates
- Calculates frontrun position sizes based on target trade
- Handles both BUY and SELL signals
- Monitors mempool and API simultaneously for faster detection

### Planned Features

Future enhancements may include:
- MongoDB persistence for trade history
- Position aggregation per market/outcome
- Proportional sell engine that mirrors trader exits
- Realized vs unrealized PnL breakdown
- Position tracking dashboard

### Manual Position Management

You can check your positions on:
- Polymarket website (your profile)
- PolygonScan (token balances)
- Polymarket API: `https://data-api.polymarket.com/positions?user=YOUR_ADDRESS`

---

## Simulation & Backtesting

### Overview

The bot includes infrastructure for simulation and backtesting, allowing you to:
- Test different `FRONTRUN_SIZE_MULTIPLIER` values
- Evaluate `GAS_PRICE_MULTIPLIER` impact on success rate
- Test different `MIN_TRADE_SIZE_USD` thresholds
- Measure performance metrics and profitability

### Running Simulations

```bash
npm run simulate
```

### Implementation Steps

To implement full backtesting:

1. **Data Collection:**
   - Fetch historical trades for tracked traders
   - Get historical market prices
   - Collect order book snapshots

2. **Simulation Logic:**
   - Reconstruct sequences of buys/sells
   - Apply your sizing rules
   - Include transaction costs
   - Handle slippage

3. **Metrics:**
   - Total PnL
   - Win rate
   - Maximum drawdown
   - Sharpe ratio
   - Capacity limits

### Suggested Approach

- Start with small time windows (1 day, 1 week)
- Test different frontrun multipliers (0.3, 0.5, 0.7)
- Test different gas multipliers (1.1, 1.2, 1.5)
- Test different minimum trade sizes ($50, $100, $500)
- Compare results across different target addresses
- Measure success rate (how often frontrun executes before target)
- Identify optimal settings before going live

---

## Troubleshooting

### Bot Not Detecting Trades

**Symptoms:** Bot runs but no trades are frontrun

**Solutions:**
1. Verify `TARGET_ADDRESSES` are correct and active traders
2. Check that target addresses have recent activity on Polymarket
3. Verify RPC URL supports pending transaction monitoring
4. Check `MIN_TRADE_SIZE_USD` - trades below this threshold are ignored
5. Increase `FETCH_INTERVAL` if network is slow (but this may reduce frontrun opportunities)
6. Check logs for API errors
7. Verify RPC URL is working: `curl $RPC_URL`
8. Ensure RPC provider supports `eth_getPendingTransactions` or similar

### Orders Not Submitting

**Symptoms:** Trades detected but orders fail

**Solutions:**
1. **Check USDC balance:**
   - Ensure sufficient USDC in wallet
   - Verify balance on PolygonScan

2. **Check gas funds:**
   - Ensure POL/MATIC balance > 0.2 (frontrunning requires higher gas)
   - Top up if needed
   - Monitor gas prices - higher gas = better frontrun success rate

3. **Verify RPC URL:**
   - Test endpoint is accessible
   - Check rate limits
   - Try alternative RPC provider

4. **Verify credentials:**
   - Confirm `PRIVATE_KEY` matches `PUBLIC_KEY`
   - Check private key format (no 0x prefix)
   - Ensure wallet has proper permissions

5. **Check market conditions:**
   - Verify market is still active
   - Check if order book has liquidity
   - Ensure price hasn't moved significantly

### Connection Issues

**Symptoms:** Bot can't connect to APIs

**Solutions:**
1. Check internet connection
2. Verify RPC URL is correct
3. Check if Polymarket API is accessible
4. Review firewall settings
5. Try different RPC provider

### High Gas Costs

**Solutions:**
1. Adjust `GAS_PRICE_MULTIPLIER` - lower values (e.g., 1.1) reduce costs but may reduce success rate
2. Increase `MIN_TRADE_SIZE_USD` to only frontrun larger, more profitable trades
3. Monitor gas prices and trade during low-traffic periods
4. Consider reducing `FRONTRUN_SIZE_MULTIPLIER` to use less capital per trade

### Performance Issues

**Solutions:**
1. Increase `FETCH_INTERVAL` if CPU usage is high
2. Reduce number of tracked traders
3. Optimize RPC endpoint (use premium providers)
4. Consider using WebSocket subscriptions (future feature)

---

## Deployment

### Local Deployment

```bash
npm run build
npm start
```

### Docker

**Build:**
```bash
docker build -t polymarket-frontrun-bot .
```

**Run:**
```bash
docker run --env-file .env -d --name polymarket-bot polymarket-frontrun-bot
```

**Stop:**
```bash
docker stop polymarket-bot
```

### Production Considerations

1. **Security:**
   - Never commit `.env` file
   - Use environment variable management
   - Rotate private keys regularly
   - Use hardware wallets if possible

2. **Monitoring:**
   - Set up logging aggregation
   - Monitor bot health
   - Track trade execution rates
   - Alert on errors

3. **Reliability:**
   - Use process managers (PM2, systemd)
   - Set up auto-restart on crashes
   - Monitor system resources
   - Keep dependencies updated

4. **Backup:**
   - Backup configuration files
   - Document your setup
   - Keep wallet recovery phrases secure

---

## Additional Resources

- [Polymarket Documentation](https://docs.polymarket.com)
- [CLOB Client Library](https://github.com/Polymarket/clob-client)
- [Polygon Documentation](https://docs.polygon.technology)

---

## Support

For issues and questions:
- **Email:** piter.jb0817@gmail.com
- **Telegram:** [@kinexbt](https://t.me/kinexbt)
- **Twitter:** [@kinexbt](https://x.com/kinexbt)

