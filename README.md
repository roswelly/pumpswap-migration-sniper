# PumpSwap Migration Sniper

PumpSwap migration sniper can snipe on the same block, 0 block(84%).

## Contact
- [telegram](https://t.me/roswellecho)

## Features

-  Real-time transaction monitoring via Geyser
-  Automatic trade execution on migration detection
-  Secure configuration management with validation
-  Comprehensive logging and error handling
-  Modern TypeScript architecture with clean code structure
-  Automatic reconnection with exponential backoff

## Project Structure

```
src/
├── core/                 # Core utilities and infrastructure
│   ├── config.ts        # Configuration management
│   ├── database.ts      # Database connection
│   ├── errors.ts        # Error handling
│   └── logger.ts        # Logging utility
├── handlers/            # Event handlers
│   ├── geyser-handler.ts      # Geyser stream handler
│   └── migration-handler.ts   # Migration detection & execution
├── services/            # External service integrations
│   ├── raydium-cpmm/    # Raydium CPMM swap service
│   └── ...              # Other services
├── constants/           # Application constants
│   ├── addresses.ts     # Program addresses
│   └── seeds.ts         # PDA seeds
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── models/              # Database models
├── executor/            # Transaction executors
└── index.ts            # Main entry point
```

## Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Geyser API access
- Solana RPC endpoint
- MongoDB (optional, for data persistence)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 0x-raydium-migration-sniper
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `GEYSER_RPC`: Your Geyser RPC endpoint
- `GEYSER_KEY`: Your Geyser API key
- `RPC_URL`: Your Solana RPC endpoint
- `ADMIN_PRIVATE_KEY`: Your wallet private key (base58 encoded)
- `CLUSTER`: Network (`mainnet` or `devnet`)
- `DB_URL`: MongoDB connection string (optional)

### Build

```bash
npm run build
```

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEYSER_RPC` | Yes | Geyser RPC endpoint |
| `GEYSER_KEY` | Yes | Geyser API key |
| `RPC_URL` | Yes | Solana RPC endpoint |
| `ADMIN_PRIVATE_KEY` | Yes | Wallet private key (base58) |
| `CLUSTER` | No | Network (`mainnet` or `devnet`) |
| `DB_URL` | No | MongoDB connection string |
| `TICKERS` | No | Comma-separated list of tickers to monitor |
| `SLIPPAGE` | No | Slippage tolerance (default: 0.001) |
| `LOG_LEVEL` | No | Logging level (`debug`, `info`, `warn`, `error`) |

## Usage

The bot automatically starts monitoring for migration transactions when launched. When a migration is detected:

1. The bot logs the migration details
2. Creates necessary token accounts
3. Executes a swap on the Raydium CPMM pool
4. Logs the transaction result

## Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build the TypeScript project
- `npm run build:watch` - Build with watch mode
- `npm start` - Start production server
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build directory

## Architecture

### Core Components

- **Config Manager**: Centralized configuration with validation
- **Logger**: Structured logging with different levels
- **Error Handler**: Custom error classes and handling
- **Database**: MongoDB connection management

### Handlers

- **Geyser Handler**: Manages Geyser stream subscription and reconnection
- **Migration Handler**: Detects migrations and executes trades

### Services

- **Raydium CPMM**: Integration with Raydium CPMM swap functionality
- **Jito**: Transaction execution via Jito bundles

## Error Handling

The project uses custom error classes for better error handling:

- `AppError`: Base error class
- `ConfigurationError`: Configuration-related errors
- `NetworkError`: Network-related errors
- `TransactionError`: Transaction execution errors
- `ValidationError`: Validation errors

## Logging

The logger supports different log levels:
- `debug`: Detailed debugging information
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages with stack traces

Set the log level via `LOG_LEVEL` environment variable.

## Security

- Never commit `.env` file
- Store private keys securely
- Use environment variables for sensitive data
- Validate all configuration on startup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Disclaimer

This software is for educational purposes only. Use at your own risk. Trading cryptocurrencies involves substantial risk of loss.
