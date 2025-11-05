# Polymarket Copy Trading Bot (Professional Edition)

Copy the best, automate success. A production-grade Polymarket copy-trading bot that monitors top traders and mirrors their positions with smart, proportional sizing, safety checks, and optional aggregation. Built with TypeScript and the official Polymarket CLOB client.

Keywords: polymarket copy trading bot, polymarket trading bot, polymarket copytrading, polymarket trading tool, prediction markets bot

---

## Highlights

- Multi-trader copy trading with proportional position sizing
- Real-time monitoring with retry/backoff and structured logs
- Safety checks: min order size, basic slippage guard (scaffold), retry limit
- Extensible strategy layer and modular services
- CLI utilities (allowance, stats, simulations – scaffold)
- Docker-ready and cloud-friendly

---

## Quick Start

### Prerequisites

- Node.js 18+
- Polygon wallet with USDC and some POL/MATIC for gas
- Optional: MongoDB (for persistent history if you enable it)

### Install

```bash
git clone https://github.com/your-org/polymarket-copy-trading-bot.git
cd polymarket-copy-trading-bot
npm install
```

### Configure

Create an `.env` file in the project root:

```bash
USER_ADDRESSES='0xabc...,0xdef...'
PROXY_WALLET='0xyour_wallet'
PRIVATE_KEY='your_private_key_no_0x'
RPC_URL='https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID'

# Optional tuning
FETCH_INTERVAL=1
TRADE_MULTIPLIER=1.0
RETRY_LIMIT=3
TRADE_AGGREGATION_ENABLED=false
TRADE_AGGREGATION_WINDOW_SECONDS=300
```

### Run

```bash
npm run build
npm start
```

---

## How It Works

1) You provide a list of Polymarket trader addresses to track.  
2) The bot polls recent activity for those traders.  
3) When a new trade is detected, the bot sizes a proportional order based on your capital and `TRADE_MULTIPLIER`.  
4) The bot sends the order via the Polymarket CLOB client.  

Note: This repository ships with a scaffolded monitor/executor. You can extend `src/modules/services/tradeMonitor.ts` to wire real data sources and finalize order routing in `src/modules/services/tradeExecutor.ts`.

---

## Scripts

- `npm run dev` – run the bot in dev mode (ts-node)
- `npm run start` – run the compiled bot
- `npm run check-allowance` – example utility script (scaffold)
- `npm run simulate` – placeholder for simulation runner

---

## Configuration Reference

| Variable | Description | Example |
| --- | --- | --- |
| `USER_ADDRESSES` | Traders to copy (comma-separated or JSON array) | `"0xabc...,0xdef..."` |
| `PROXY_WALLET` | Your Polygon wallet address | `"0x123..."` |
| `PRIVATE_KEY` | Private key without 0x prefix | `"abcd..."` |
| `RPC_URL` | Polygon RPC endpoint | `"https://polygon-mainnet.infura.io/v3/..."` |
| `FETCH_INTERVAL` | Poll frequency in seconds | `1` |
| `TRADE_MULTIPLIER` | Scale position size relative to trader | `2.0` |
| `RETRY_LIMIT` | Max retry attempts on failures | `3` |
| `TRADE_AGGREGATION_ENABLED` | Aggregate sub-$1 buys into one order | `true` |
| `TRADE_AGGREGATION_WINDOW_SECONDS` | Aggregation window (seconds) | `300` |

---

## Roadmap

- Implement full trade fetching from Polymarket activity feeds
- Finish order routing with price protection and min-size enforcement
- Add MongoDB persistence with position tracking
- Provide full simulation/backtesting toolkit
- Add web dashboard for monitoring

---

## SEO – Polymarket Trading Bot & Copytrading

This project is designed as a professional, extensible Polymarket trading tool. If you are searching for a “Polymarket copy trading bot”, “Polymarket copytrading bot”, or “Polymarket trading bot”, this repository provides a modern TypeScript implementation, leveraging the official CLOB client and best practices for monitoring, risk controls, and modular strategy development.

---

## Legal & Risk

Trading involves risk. Use at your own risk. Ensure compliance with applicable laws and Polymarket’s terms. Test with small amounts first and monitor execution frequently.

---

## Acknowledgments

- Built with the official Polymarket CLOB client
- Inspired by prior open-source Polymarket copy trading efforts
