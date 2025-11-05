# Migration Guide - Project Restructure

This document outlines the changes made during the senior developer restructure of the project.

## Overview

The project has been restructured with modern best practices, improved organization, and better maintainability.

## Key Changes

### 1. Dependencies Updated

All dependencies have been updated to their latest versions:
- `@coral-xyz/anchor`: ^0.31.1 → ^0.32.1
- `@solana/web3.js`: ^1.98.2 → ^1.98.4
- `@solana/spl-token`: ^0.4.13 → ^0.4.14
- `mongoose`: ^8.16.0 → ^8.19.3
- `axios`: ^1.10.0 → ^1.13.2
- `typescript`: ^5.3.3 → ^5.9.3
- `@types/node`: ^20.11.24 → ^22.10.5
- `nodemon`: ^3.1.0 → ^3.1.9

### 2. New Project Structure

```
src/
├── core/                    # Core infrastructure
│   ├── config.ts           # Centralized configuration with validation
│   ├── database.ts         # Database connection management
│   ├── errors.ts           # Custom error classes
│   └── logger.ts           # Structured logging utility
├── handlers/               # Event handlers
│   ├── geyser-handler.ts  # Geyser stream management
│   └── migration-handler.ts # Migration detection & execution
├── constants/             # Application constants
│   ├── addresses.ts       # Program addresses
│   ├── seeds.ts           # PDA seeds
│   └── index.ts           # Barrel export
├── types/                 # TypeScript type definitions
│   └── index.ts           # Centralized types
├── service/               # Existing services (unchanged)
├── utils/                 # Utility functions
├── models/                # Database models
├── executor/              # Transaction executors
├── index.ts              # Main entry point
└── exports.ts            # Barrel exports for library usage
```

### 3. Core Infrastructure

#### Configuration Management (`src/core/config.ts`)
- Centralized configuration with validation
- Environment variable validation on startup
- Type-safe configuration access
- Backward compatible exports for existing code

#### Logging (`src/core/logger.ts`)
- Structured logging with levels (debug, info, warn, error)
- Configurable via `LOG_LEVEL` environment variable
- Timestamp support
- Error stack trace logging

#### Error Handling (`src/core/errors.ts`)
- Custom error classes:
  - `AppError`: Base error class
  - `ConfigurationError`: Config issues
  - `NetworkError`: Network problems
  - `TransactionError`: Transaction failures
  - `ValidationError`: Validation failures
- Error handler utility for consistent error processing

#### Database (`src/core/database.ts`)
- Improved connection management
- Automatic reconnection logic
- Graceful shutdown support

### 4. Handlers

#### Geyser Handler (`src/handlers/geyser-handler.ts`)
- Class-based architecture
- Automatic reconnection with exponential backoff
- Better error handling
- Cleaner separation of concerns

#### Migration Handler (`src/handlers/migration-handler.ts`)
- Encapsulated migration logic
- Better error handling
- Improved logging
- Transaction simulation before execution

### 5. Constants Organization

All constants consolidated into `src/constants/`:
- `addresses.ts`: All program addresses
- `seeds.ts`: All PDA seeds
- Legacy exports maintained for backward compatibility

### 6. Types Organization

All types consolidated into `src/types/index.ts`:
- Transaction types
- Pool types
- Migration types
- Service types

### 7. TypeScript Configuration

Enhanced `tsconfig.json`:
- Target: ES2022
- Source maps enabled
- Declaration files enabled
- Path aliases configured
- Stricter type checking

### 8. Package.json Improvements

- Better scripts
- Updated dependencies
- Node.js version requirement
- Improved metadata

### 9. Documentation

- Updated README.md with comprehensive documentation
- Migration guide (this file)
- Environment variable examples

## Migration Steps

### For Existing Code

1. **Update Imports**: 
   - Old: `import { GEYSER_RPC } from './config/index'`
   - New: `import { GEYSER_RPC } from './core/config'` or `import { GEYSER_RPC } from './exports'`

2. **Use New Logger**:
   - Old: `console.log('message')`
   - New: `logger.info('message')`

3. **Use New Error Handling**:
   - Old: `throw new Error('message')`
   - New: `throw new AppError('message', 'ERROR_CODE')`

4. **Configuration Access**:
   - Old: Direct `process.env` access
   - New: `config.geyser.rpc` or use exported constants

### Backward Compatibility

The old structure is still available for backward compatibility:
- `src/config/index.ts` still exists (but consider migrating)
- Old exports still work via `src/exports.ts`

## Benefits

1. **Better Organization**: Clear separation of concerns
2. **Type Safety**: Improved TypeScript configuration
3. **Error Handling**: Consistent error management
4. **Logging**: Structured, configurable logging
5. **Maintainability**: Easier to understand and modify
6. **Scalability**: Better structure for growth
7. **Documentation**: Comprehensive docs and examples

## Next Steps

1. Update any remaining imports to use new structure
2. Migrate from old config to new config system
3. Replace console.log with logger
4. Use custom error classes instead of generic Error
5. Test thoroughly with new structure

## Notes

- The old `bot.ts` file is still present but not used in the new entry point
- Services in `src/service/` remain unchanged
- All existing functionality is preserved
- New structure is opt-in - old code still works

