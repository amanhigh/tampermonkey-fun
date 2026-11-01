# AGENTS.md

## Coding
- For Interface Methods use inherit docs in Class.
- Don't use \_ for private methods as typescript has private keyword.
- Take Care of Async Functions and match return type at integration points.
- Update Factory for Dependency Injection and any Constructor Changes. (Don't use Factory directly outside Core.)
- Refer constant.ts (IDS) for UI Component Names which user will mention.

## Development Commands

### Userscript Building
- `just setup [project]`: Format, compile, lint, test, then build and watch one userscript in development mode — the project defaults to `barkat` directly in the Justfile recipe; pass `barkat`, `experiment`, `imdb`, `picasso` or `seer` to select explicitly
- `just install [project]`: Build all five production userscripts plus the selected project's development build, then serve them for local installation
- `just bundle [project] [mode]`: Bundle with webpack directly — defaults to `all` + `production`; bypasses the quality gates (see the README's [Build](README.md#build) section)
- Build mechanics, debug artifacts and install steps live in the README's [Build](README.md#build), [Debug](README.md#debug) and [Local Installation](README.md#local-installation) sections; refer to them instead of restating them.

### Project Management
- `just prepare`: One-time NPM setup
- `just build`: Format, compile and lint (see the README's [Build](README.md#build) section)
- `just clean`: Remove dist and node_modules
- `just reset`: Clean, then prepare and setup again

## Architecture Overview

This is a TypeScript-based Tampermonkey/Greasemonkey userscript development environment with webpack bundling.

### Core Structure
- **`src/core/`**: Main application entry points (experiment.ts, barkat.ts, imdb.ts, picasso.ts, seer.ts)
- **`src/handler/`**: Event handlers and user interaction logic
- **`src/manager/`**: Business logic managers for different features
- **`src/models/`**: Data models and type definitions grouped by ownership:
  - `barkat/market/`: tickers, timeframes, classification and analysis
  - `barkat/alert/`: alert mappings, prices and feed events
  - `barkat/audit/`: audit plugin and backend catalogue contracts
  - `barkat/`: journal, GTT and cross-capability domain events
  - `integrations/`: external service and site contracts/configuration
  - `presentation/`: bars, DOM descriptions, display state and colors
  - `shared/`: API primitives, serialized events and cross-cutting constants
- **`src/repo/`**: Data access layer and storage repositories  
- **`src/client/`**: External API clients (Kite, Investing.com)
- **`src/util/`**: Utility functions and helpers
- **`src/style/`**: LESS stylesheets

### Key Patterns
- Factory pattern used for dependency injection (`src/core/factory.ts`)
- One shared webpack factory builds every userscript, and per-script differences are data rather than configs; see the README's [Build](README.md#build) section
- Experiment script (`src/core/experiment.ts`) is the scratch entry point, selected with `just setup experiment`
- Production entry points are already wired; see the README's
  [Local Installation](README.md#local-installation) section. Seer deletion behaviour is documented in the README's [Seer Deletion](README.md#seer-deletion) section.

### Development Workflow
1. Run `just prepare` once.
2. Install first — `just install [project]`, then install from the served URLs (see the README's [Local Installation](README.md#local-installation) section).
3. Run `just setup [project]` to gate, build and watch one userscript (see the README's [Debug](README.md#debug) section).

### Testing
- Jest configuration with TypeScript support
- Test files in `test/` directory mirroring `src/` structure
- Coverage reports generated to `coverage/` directory

### Code Quality
- ESLint with TypeScript rules configured in `eslint.config.mjs`
- Prettier for code formatting
- TypeScript strict mode enabled
- Max complexity and function length limits enforced