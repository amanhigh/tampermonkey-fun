# AGENTS.md

## Coding
- For Interface Methods use inherit docs in Class.
- Don't use \_ for private methods as typescript has private keyword.
- Take Care of Async Functions and match return type at integration points.
- Update Factory for Dependency Injection and any Constructor Changes. (Don't use Factory directly outside Core.)
- Refer constant.ts (IDS) for UI Component Names which user will mention.

## Development Commands

### Userscript Building
- `just dev [project]`: Build and watch one userscript in development mode — defaults to `barkat`, pass `imdb`, `picasso`, `seer` or `experiment` to select explicitly
- `just install`: Build all production userscripts and serve them for local installation
- `just bundle [project] [mode]`: Bundle with webpack directly — defaults to `all` + `production`; bypasses the quality gates (see the README's [Build](README.md#build) section)
- Build mechanics, debug artifacts and install steps live in the README's [Build](README.md#build), [Debug](README.md#debug) and [Local Installation](README.md#local-installation) sections; refer to them instead of restating them.

### Project Management
- `just prepare`: One-time NPM setup
- `just build`: Format, compile and lint (see the README's [Build](README.md#build) section)
- `just setup`: Build, test, then start the dev watcher (defaults to `barkat`)
- `just clean`: Remove dist and node_modules
- `just reset`: Clean, then prepare and setup again

## Architecture Overview

This is a TypeScript-based Tampermonkey/Greasemonkey userscript development environment with webpack bundling.

### Core Structure
- **`src/core/`**: Main application entry points (experiment.ts, barkat.ts, imdb.ts, picasso.ts, seer.ts)
- **`src/handler/`**: Event handlers and user interaction logic
- **`src/manager/`**: Business logic managers for different features
- **`src/models/`**: Data models and type definitions
- **`src/repo/`**: Data access layer and storage repositories  
- **`src/client/`**: External API clients (Kite, Investing.com)
- **`src/util/`**: Utility functions and helpers
- **`src/style/`**: LESS stylesheets

### Key Patterns
- Factory pattern used for dependency injection (`src/core/factory.ts`)
- One shared webpack factory builds every userscript, and per-script differences are data rather than configs; see the README's [Build](README.md#build) section
- Experiment script (`src/core/experiment.ts`) is the scratch entry point, selected with `just dev experiment`
- Production entry points are already wired; see the README's
  [Local Installation](README.md#local-installation) section. Seer deletion behaviour is documented in the README's [Seer Deletion](README.md#seer-deletion) section.

### Development Workflow
1. Run `just prepare` once, then `just dev` (or `just dev experiment` for the scratch entry) to build and watch
2. Load the development userscript in Tampermonkey with file:// access for hot reloading (see the README's [Debug](README.md#debug) section)
3. For production: see the README's
   [Local Installation](README.md#local-installation) section.

### Testing
- Jest configuration with TypeScript support
- Test files in `test/` directory mirroring `src/` structure
- Coverage reports generated to `coverage/` directory

### Code Quality
- ESLint with TypeScript rules configured in `eslint.config.mjs`
- Prettier for code formatting
- TypeScript strict mode enabled
- Max complexity and function length limits enforced