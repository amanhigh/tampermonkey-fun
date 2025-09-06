# AGENTS.md

## Coding
- For Interface Methods use inherit docs in Class.
- Don't use \_ for private methods as typescript has private keyword.
- Take Care of Async Functions and match return type at integration points.
- Update Factory for Dependency Injection and any Constructor Changes. (Don't use Factory directly outside Core.)
- Refer constant.ts (IDS) for UI Component Names which user will mention.

## Development Commands

### Userscript Building
- `make experiment`: Build experiment script for debugging (outputs to `dist/index.dev.user.js`)
- `make barkat`: Build Barkat userscript
- `make imdb`: Build IMDB userscript  
- `make picasso`: Build Picasso userscript

### Project Management
- `make prepare`: One-time NPM setup
- `make clean`: Remove dist and node_modules
- `make reset`: Clean and rebuild everything
- `npm run analyze`: Build with bundle analyzer

## Architecture Overview

This is a TypeScript-based Tampermonkey/Greasemonkey userscript development environment with webpack bundling.

### Core Structure
- **`src/core/`**: Main application entry points (experiment.ts, barkat.ts, imdb.ts, picasso.ts)
- **`src/handler/`**: Event handlers and user interaction logic
- **`src/manager/`**: Business logic managers for different features
- **`src/models/`**: Data models and type definitions
- **`src/repo/`**: Data access layer and storage repositories  
- **`src/client/`**: External API clients (Kite, Investing.com)
- **`src/util/`**: Utility functions and helpers
- **`src/style/`**: LESS stylesheets

### Key Patterns
- Factory pattern used for dependency injection (`src/core/factory.ts`)
- Each core script has its own webpack config in `config/` directory
- Experiment script (`src/core/experiment.ts`) is the main development/debug entry point
- Production builds require uncommenting entry point calls in core files

### Development Workflow
1. Modify experiment entry point in `src/core/experiment.ts`
2. Run `make setup` to build and start live reload
3. Load `dist/index.dev.user.js` in Tampermonkey with file:// require for hot reloading
4. For production: uncomment entry point in target core file, run specific make command, copy `dist/index.prod.user.js`

### Testing
- Jest configuration with TypeScript support
- Test files in `test/` directory mirroring `src/` structure
- Coverage reports generated to `coverage/` directory

### Code Quality
- ESLint with TypeScript rules configured in `eslint.config.mjs`
- Prettier for code formatting
- TypeScript strict mode enabled
- Max complexity and function length limits enforced