# Polymarket Trading Bot - CopyTrading Bot

Polymarket Trading Bot(Polymarket Copytrading & Polymarket Arbitrage bot) with full credential management, order execution, market analysis, and automated copytrading & arbitrage trading capabilities.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellow.svg)](LICENSE)

## 🎯 Overview

This **Polymarket copy trading bot** and **Monitoring bot** enables automated trading on Polymarket by:

- **Copy Trading**: Automatically replicate trades from successful Polymarket traders
- **Monitoring**: Dynamic monitoring for better exp of user's manual trading
- **Mempool Monitoring**: Real-time detection of pending transactions on Polygon network
- **Risk Management**: Built-in position tracking, slippage protection, and exposure limits
- **Enterprise Features**: Health monitoring, MongoDB persistence, rate limiting, and more
- **Position Sizing**: Configurable position size multipliers (e.g., 0.5x, 1x, 2x)
- **Safety Features**: Position limits, trade size limits, dry-run mode
- **Automatic Updates**: Poll-based monitoring with configurable intervals
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Easy Integration**: Simple API for custom monitoring and trading solutions

Perfect for traders who want to automate their Polymarket strategy by following successful traders or frontrunning large transactions.

<!-- Add screenshots/demo images here -->
<!-- 
![Bot Dashboard](docs/images/dashboard.png)
![Trade Execution](docs/images/trades.png)
![Health Metrics](docs/images/health.png)
-->

## ✨ Key Features

### 🚀 Trading Capabilities
- **Automatic Copy Trading** - Mirror trades from profitable Polymarket traders
- **Mempool Frontrunning** - Execute trades before target transactions with higher gas prices
- **Real-time Monitoring** - Hybrid approach using both mempool and Polymarket API
- **Gas Price Optimization** - Automatic gas price extraction and multiplier-based priority execution

### 🛡️ Risk Management
- **Position Tracking** - Monitor all open positions with entry prices and sizes
- **Slippage Protection** - Configurable maximum slippage thresholds
- **Exposure Limits** - Per-market and total exposure limits to prevent over-leveraging
- **Size Controls** - Frontrun size multiplier (default: 50% of target trade)

### 🔧 Production-Ready Features
- **MongoDB Persistence** - Prevents duplicate trades after restarts
- **Rate Limiting** - Protects against API bans and respects rate limits
- **Health Monitoring** - HTTP endpoints for metrics and health checks
- **Connection Pooling** - Optimized HTTP connections for better performance
- **Order Book Caching** - Reduces API calls and improves latency
- **Graceful Shutdown** - Proper cleanup on termination signals

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **Polygon Wallet** - With USDC balance for trading
- **POL/MATIC** - For gas fees (recommended: 0.5+ POL for frontrunning)
- **MongoDB** (Optional) - For duplicate detection persistence

### Installation

```bash
# Clone the repository
git clone https://github.com/Trum3it/polymarket-copy-trading-bot.git
cd polymarket-copy-trading-bot

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

1. **Create environment file:**
```bash
cp .env.example .env
```

2. **Edit `.env` with your settings:**
```env
# Required: Basic Configuration
TARGET_ADDRESS=0x1234567890123456789012345678901234567890  # Target address to monitor
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000  # Your wallet private key

# Copy Trading Configuration
COPY_TRADING_ENABLED=true           # Enable copy trading (true/false)
DRY_RUN=true                        # Dry run mode - simulates trades (ALWAYS test with true first!)
POSITION_SIZE_MULTIPLIER=1.0        # Position size multiplier (0.5 = 50%, 1.0 = 100%, 2.0 = 200%)
MAX_POSITION_SIZE=10000             # Maximum position size in USD
MAX_TRADE_SIZE=5000                 # Maximum trade size in USD
MIN_TRADE_SIZE=1                    # Minimum trade size in USD
SLIPPAGE_TOLERANCE=1.0              # Slippage tolerance as percentage

# Monitoring Configuration
POLL_INTERVAL=30000                 # Polling interval in milliseconds (30000 = 30 seconds)

# Optional: API Configuration
# POLYMARKET_API_KEY=your_api_key_here
# CHAIN_ID=137                      # Default: 137 (Polygon mainnet)
# CLOB_HOST=https://clob.polymarket.com
```

3. **Run the bot:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📊 Example Transactions

Check out these successful frontrun trades:

- [Transaction 1](https://polygonscan.com/tx/0xd2c8462e6a35d0e4148a9c7fc810f2614d23bfdf061767486734e62f2c33ba9f) - $0.86 copy trade on market X
- [Transaction 2](https://polygonscan.com/tx/0x592343861683a413bc9d88654c5196751571144155c0a122c94b0f85c3b0f68b) - $42.66 copy trade on market Y
- [Transaction 3](https://polygonscan.com/tx/0x2dd97972bd1836251c2b447ec44b4882aead5600570e29ff8150ae3b75f88678) - $0.08 copy trade on market Z

## ⚙️ Configuration Guide

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TARGET_ADDRESSES` | Comma-separated addresses to frontrun/copy | `0xabc...,0xdef...` |
| `PUBLIC_KEY` | Your Polygon wallet address | `0xYourWalletAddress` |
| `PRIVATE_KEY` | Your wallet private key | `0xYourPrivateKey` |
| `RPC_URL` | Polygon RPC endpoint (must support pending tx) | `https://polygon-mainnet.infura.io/v3/...` |

### Optional Configuration

#### Trading Parameters
```env
FETCH_INTERVAL=1                    # API polling interval (seconds)
MIN_TRADE_SIZE_USD=100              # Minimum trade size to frontrun (USD)
FRONTRUN_SIZE_MULTIPLIER=0.5        # Frontrun size as % of target (0.0-1.0)
GAS_PRICE_MULTIPLIER=1.2            # Gas price multiplier (1.2 = 20% higher)
USDC_CONTRACT_ADDRESS=0x2791...     # USDC contract (default: Polygon mainnet)
RETRY_LIMIT=3                       # Maximum retry attempts for failed orders
```

#### Risk Management
```env
MAX_SLIPPAGE_PERCENT=2.0            # Maximum acceptable slippage (default: 2.0%)
MAX_POSITION_SIZE_USD=10000         # Maximum position size per market (USD)
MAX_TOTAL_EXPOSURE_USD=50000        # Maximum total exposure across all positions (USD)
```

#### Infrastructure
```env
MONGO_URI=mongodb://localhost:27017/polymarket-bot  # MongoDB connection (recommended)
HEALTH_CHECK_PORT=3000              # Health monitoring HTTP server port
TRADE_AGGREGATION_ENABLED=false     # Enable trade aggregation
TRADE_AGGREGATION_WINDOW_SECONDS=300 # Aggregation time window (seconds)
```

#### Polymarket API (Optional)
```env
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_API_PASSPHRASE=your_passphrase
```

## 📖 How It Works

### Frontrunning Flow

1. **Mempool Detection** - Bot monitors Polygon mempool for pending transactions
2. **API Monitoring** - Simultaneously polls Polymarket API for recent trades from target addresses
3. **Signal Generation** - When a pending trade is detected, extracts:
   - Trade details (market, outcome, side, size, price)
   - Target transaction gas price
   - Transaction hash for tracking
4. **Gas Calculation** - Calculates frontrun gas price: `target_gas × GAS_PRICE_MULTIPLIER`
5. **Risk Checks** - Validates:
   - Minimum trade size threshold
   - Position size limits
   - Total exposure limits
   - Sufficient balance
   - Slippage protection
6. **Order Execution** - Submits market order with priority gas price
7. **Position Tracking** - Records position for ongoing management

### Copy Trading Flow

The bot can also function as a **Polymarket copy trading bot** by:

- Monitoring specific trader addresses
- Detecting their trades in real-time
- Executing proportional trades with configurable multipliers
- Tracking positions and mirroring exits

## 🔍 Advanced Features

### Health Monitoring

Access real-time bot metrics via HTTP endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Detailed metrics
curl http://localhost:3000/metrics
```

**Metrics include:**
- Uptime
- Trades executed/failed
- Last trade timestamp
- Wallet balances (POL and USDC)
- Error history
- Health status

### MongoDB Setup

MongoDB is **highly recommended for production** to prevent duplicate trade execution after restarts.

**Quick Setup:**

```bash
# Option 1: Local MongoDB
mongod --dbpath /path/to/data

# Option 2: MongoDB Atlas (Cloud)
# Create free cluster at https://www.mongodb.com/cloud/atlas
```

**Connection String:**
```env
MONGO_URI=mongodb://localhost:27017/polymarket-bot
# or
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/polymarket-bot
```

The bot automatically:
- Connects on startup
- Stores processed transaction hashes
- Prevents duplicate execution
- Cleans up expired entries (24h TTL)

### RPC Endpoint Requirements

**Recommended Providers:**
- [Infura](https://infura.io) - Free tier available
- [Alchemy](https://alchemy.com) - Free tier available  
- [QuickNode](https://quicknode.com) - Free tier available
- [Ankr](https://www.ankr.com) - Free tier available

**Note:** Some free tier providers may have rate limits. For production running, consider premium providers with WebSocket support.

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development mode (TypeScript direct execution with hot reload) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Production mode (runs compiled JavaScript) |
| `npm run lint` | Run ESLint linter |
| `npm run lint:fix` | Automatically fix linting errors |
| `npm run check-allowance` | Check token allowance for USDC |
| `npm run verify-allowance` | Verify current token allowance |
| `npm run set-token-allowance` | Set token allowance for trading |
| `npm run manual-sell` | Manually sell positions |
| `npm run simulate` | Run simulation/backtesting |

## 🐳 Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t polymarket-copy-trading-bot .

# Run with environment file
docker run --env-file .env -d --name polymarket-bot polymarket-copy-trading-bot

# View logs
docker logs -f polymarket-bot

# Stop
docker stop polymarket-bot
```

### Docker Compose

```bash
docker-compose up -d
```

### Recommended Settings

**For Fast Detection:**
```env
FETCH_INTERVAL=0.5              # Faster polling (higher API load)
GAS_PRICE_MULTIPLIER=1.5        # Higher gas = better frontrun success
```

**For Cost Efficiency:**
```env
MIN_TRADE_SIZE_USD=500          # Only frontrun larger trades
FRONTRUN_SIZE_MULTIPLIER=0.3    # Smaller position sizes
GAS_PRICE_MULTIPLIER=1.1        # Lower gas costs
```

**For Risk Management:**
```env
MAX_SLIPPAGE_PERCENT=1.0        # Stricter slippage control
MAX_POSITION_SIZE_USD=5000      # Smaller position limits
MAX_TOTAL_EXPOSURE_USD=25000    # Lower total exposure
```

## 🛠️ Troubleshooting

### Common Issues

**Bot not detecting trades:**
- Verify `TARGET_ADDRESSES` are correct and active
- Check RPC URL supports pending transaction monitoring
- Increase `FETCH_INTERVAL` if network is slow
- Verify `MIN_TRADE_SIZE_USD` threshold

**Orders failing:**
- Check USDC balance
- Verify POL/MATIC balance for gas (>0.2 POL recommended)
- Confirm RPC endpoint is accessible
- Check market is still active

**High gas costs:**
- Lower `GAS_PRICE_MULTIPLIER` (e.g., 1.1 instead of 1.2)
- Increase `MIN_TRADE_SIZE_USD` to only frontrun larger trades
- Monitor network congestion

**MongoDB connection errors:**
- Verify MongoDB is running
- Check connection string format
- Ensure network access if using cloud MongoDB
- Bot will continue without MongoDB (in-memory only)

## 📝 Adding Images and Transaction Links to README

### Adding Images

1. **Create an images folder:**
```bash
mkdir -p docs/images
```

### Diagram

![PNL Portfolio](docs/images/dashboard.png)
![Trade Execution Flow](docs/images/trade-flow.png)
![FrontRunning Trade](docs/images/follow.png)
![Target's Trade](docs/images/target.png)
```

### Transaction Links

**For successful trades, add links like this:**

## 📊 Recent Trades

- [Frontrun Trade #1](https://polygonscan.com/tx/0xa06942c7972bc4bafc0e4631b92efd948a1a23daefd687382a6a292368beab8b) - $0.1 on Market X
- [Target Trade #2](https://polygonscan.com/tx/0x93c0968a7ac34ff8f09d687465990f0d59e59c416c5e1914b0fbe88370c3ba3c) - $0.06 on Market Y
```

**Format:**
```markdown
- [Trade Description](https://polygonscan.com/tx/0xa06942c7972bc4bafc0e4631b92efd948a1a23daefd687382a6a292368beab8b) - $0.1, Block Number - 81320890
```

### Showcase of Bot:

```markdown
## 📸 Screenshots

<div align="center">
  
  <img src="docs/images/dashboard.png" alt="Dashboard" width="400"/>
  <p><em>Real-time trading dashboard</em></p>
  
  <img src="docs/images/trade-flow.png" alt="Trades" width="400"/>
  <p><em>Trade execution history</em></p>
  
</div>
```

## 🔐 Security Best Practices

- **Never commit `.env` file** - Add to `.gitignore`
- **Use environment variables** - Store secrets securely
- **Rotate private keys** - Regularly update credentials
- **Monitor balances** - Set up alerts for unusual activity
- **Use hardware wallets** - For production deployments
- **Limit permissions** - Use minimum required wallet permissions

## 📚 Additional Documentation

- [Complete Setup Guide](./docs/GUIDE.md) - Detailed setup and configuration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**IMPORTANT LEGAL DISCLAIMER:**

This software is provided "as-is" for educational and research purposes only. Trading cryptocurrencies and prediction markets involves substantial risk of loss. 

- **No Warranty**: The software is provided without any warranties
- **Use at Your Own Risk**: You are solely responsible for any losses incurred
- **Not Financial Advice**: This is not investment or trading advice
- **Compliance**: Ensure compliance with local laws and regulations
- **Testing**: Always test with small amounts first
- **Frontrunning**: May have legal and ethical implications in some jurisdictions

The authors and contributors are not responsible for any financial losses, damages, or legal issues arising from the use of this software.

## 📞 Support & Contact

- **Telegram**: [@trum3it](https://t.me/trum3it)
- **Issues**: [GitHub Issues](https://github.com/your-username/polymarket-copy-trading-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/polymarket-copy-trading-bot/discussions)

## 🌟 Star History

If you find this project useful, please consider giving it a star ⭐

## 📈 Roadmap

- [ ] WebSocket mempool monitoring
- [ ] Advanced strategy backtesting
- [ ] Web dashboard UI
- [ ] Telegram notifications
- [ ] Multi-wallet support
- [ ] Advanced position management
- [ ] PnL tracking and reporting

---

**Keywords**: Polymarket bot, Polymarket copy trading bot, Polymarket frontrun bot, automated trading, Polygon bot, prediction markets bot, mempool monitoring, MEV bot, trading automation
