# Polymarket Copy Trading Bot

Copy the best, automate success. A production-grade Polymarket copy-trading bot that monitors top traders and mirrors their positions with smart, proportional sizing, safety checks, and optional aggregation. Built with TypeScript and the official Polymarket CLOB client.

Keywords: polymarket copy trading bot, polymarket trading bot, polymarket copytrading, polymarket trading tool, prediction markets bot

[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![Polymarket CLOB](https://img.shields.io/badge/Polymarket-CLOB%20Client-purple?style=flat)](https://github.com/Polymarket/clob-client)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![ESLint](https://img.shields.io/badge/ESLint-configured-4B32C3?style=flat&logo=eslint)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-configured-F7B93E?style=flat&logo=prettier)](https://prettier.io/)

# Contact Me 

[![Email](https://img.shields.io/badge/Email-xsui46941@gmail.com-D14836?style=flat&logo=gmail)](mailto:xsui46941@gmail.com)
[![Telegram](https://img.shields.io/badge/Telegram-@lorine93s-2CA5E0?style=flat&logo=telegram)](https://t.me/lorine93s)
[![Twitter/X](https://img.shields.io/badge/Twitter-@kakamajo__btc-0000f0?style=flat&logo=x)](https://twitter.com/kakamajo_btc)


## Highlights

- Multi-trader copy trading with proportional position sizing
- Real-time monitoring with retry/backoff and structured logs
- Safety checks: min order size, basic slippage guard (scaffold), retry limit
- Extensible strategy layer and modular services
- CLI utilities (allowance, stats, simulations – scaffold)
- Docker-ready and cloud-friendly


## Workflow Overview

1) Discovery: the monitor polls recent activity for your selected Polymarket trader addresses.
2) Signal: on a new BUY/SELL, a TradeSignal is created with market, outcome, price, and size.
3) Sizing: the copy strategy computes proportional USD size using your balance and multiplier.
4) Execution: the executor posts a market order via the Polymarket CLOB client (wire-in point).
5) Tracking (optional): persist fills and compute PnL/positions for reporting and proportional exits.

This repo ships a compile-ready scaffold. Wire the real activity feed and order posting where noted to go fully live.


## Architecture & Key Tech

- Language: TypeScript (strict mode)
- Runtime: Node.js 18+
- Trading: `@polymarket/clob-client` (official)
- Crypto: `ethers` wallet/provider
- Data/HTTP: `axios`
- Logging/UI: `chalk`, `ora`
- Optional DB: `mongoose` (MongoDB)
- Quality: ESLint + Prettier
- Container: Docker, docker-compose

Module map (src/modules):
- config/env.ts – env loading/validation
- config/copyStrategy.ts – proportional sizing formula
- services/createClobClient.ts – Polymarket client factory
- services/tradeMonitor.ts – polling loop producing TradeSignal
- services/tradeExecutor.ts – sizing + order submission
- utils/logger.ts – structured console logs
- utils/fetchData.ts, postOrder.ts, getMyBalance.ts, spinner.ts – helpers


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


## How It Works

1) You provide a list of Polymarket trader addresses to track.  
2) The bot polls recent activity for those traders.  
3) When a new trade is detected, the bot sizes a proportional order based on your capital and `TRADE_MULTIPLIER`.  
4) The bot sends the order via the Polymarket CLOB client.  

Note: This repository ships with a scaffolded monitor/executor. You can extend `src/modules/services/tradeMonitor.ts` to wire real data sources and finalize order routing in `src/modules/services/tradeExecutor.ts`.


## Scripts

- `npm run dev` – run the bot in dev mode (ts-node)
- `npm run start` – run the compiled bot
- `npm run check-allowance` – example utility script (scaffold)
- `npm run simulate` – placeholder for simulation runner


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


## Deployment

- Local: `npm run build && npm start`
- Docker: `docker build -t polymarket-copy-bot . && docker run --env-file .env polymarket-copy-bot`
- Compose: `docker-compose up -d`

Set environment variables via `.env` or your orchestrator (render, fly, k8s).


## Roadmap

- Implement full trade fetching from Polymarket activity feeds
- Finish order routing with price protection and min-size enforcement
- Add MongoDB persistence with position tracking
- Provide full simulation/backtesting toolkit
- Add web dashboard for monitoring

## SEO – Polymarket Trading Bot & Copytrading

This project is designed as a professional, extensible Polymarket trading tool. If you are searching for a “Polymarket copy trading bot”, “Polymarket copytrading bot”, or “Polymarket trading bot”, this repository provides a modern TypeScript implementation, leveraging the official CLOB client and best practices for monitoring, risk controls, and modular strategy development.
