# tampermonkey-fun

[![Build](https://github.com/amanhigh/tampermonkey-fun/actions/workflows/ci.yml/badge.svg)](https://github.com/amanhigh/tampermonkey-fun/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/amanhigh/tampermonkey-fun/branch/master/graph/badge.svg)](https://codecov.io/gh/amanhigh/tampermonkey-fun)

Experiment and Useful Grease/TamperMonkey Scripts.

## Debug
For debugging, use the experiment script. The main file for experiments is [`src/core/experiment.ts`](src/core/experiment.ts:1).
To get started with a debug environment, run:
-   Add Call to EntryPoint Function in `src/core/experiment.ts`.
-   `make setup` (Build Project and start Live Reload)
-   Load Debug Script with Updated Header in Tamper Monkey. `dist/index.dev.user.js`

To load the debug version of the script in Tampermonkey, ensure your userscript metadata includes:
```javascript
// @require     file:///home/aman/Projects/tampermonkey-fun/dist/index.debug.js
```

## Local Installation
The authoritative path for installing the built userscripts locally without editing any source file.
- **Entry Points**: each core file is its own entry point and self-starts only when bundled directly; importing it (e.g. from `src/core/experiment.ts`) just exposes its classes and `Run*` function, so no source edit is needed.
- **Command**: `just install` — builds `barkat`, `imdb` and `picasso` in one webpack run, then serves them.
- **Install**: open one of the served URLs and confirm the install in Tampermonkey:
  - `http://127.0.0.1:8765/barkat.user.js`
  - `http://127.0.0.1:8765/imdb.user.js`
  - `http://127.0.0.1:8765/picasso.user.js`
- **Confirmation**: the Tampermonkey dashboard lists the script under the name declared in its metadata.
- **Manual reinstall**: the script version is unchanged between builds, so reinstall manually — rerun `just install` and open the same URL again (stop the running server first, see **Stop** below).
- **Stop**: press `Ctrl+C`. The server is only needed for installation — installed scripts keep working without it.
- **Fallback**: Tampermonkey Dashboard → Utilities → Import from URL → paste the same URL.
- **Permissions**: no userscript file-URL access is needed for this path; the normal userscript execution permissions for the target sites are still required.

## Barkat Watchlist Warm-up
The Barkat userscript asks the backend to pre-warm analysis coverage for the
watchlist. The backend request/response contract, accept semantics and all
policy (including what "warm" means) are owned by the Barkat backend; this
frontend only decides *which* tickers to submit and *when*.

-   **Eligibility**: only tickers in the active watchlist that resolve to a
    confirmed, tracked equity ticker record are submitted. Unknown tickers and
    non-equity records are skipped silently.
-   **Triggers**: the current watchlist snapshot is submitted once on first load
    and again on every watchlist membership change. Each trigger re-reads the
    full watchlist from the DOM, so event deltas (including removals) are never
    trusted.
    -   Chart selection, category, timeframe and metadata changes never trigger a
        warm-up.
    -   Warm-up runs independently of the paint/refresh path: it never delays the
        UI, and a failed request only logs.
-   **Accepted, not complete**: a resolved call means the backend *accepted* the
    request; it does not mean coverage is ready yet.
-   **Recovery**: there are no timers, retries or background polling. A failed
    warm-up is retried only by the next load or membership trigger.

## NPM Commands
Key `npm` commands for project and dependency management:
- `npm init`: Initialize a new npm package (if starting from scratch).
- `npm install` (or `npm i`): Install project dependencies from `package.json`.
- `npm update` (or `npm up`): Update project dependencies to their latest versions based on `package.json`.
- `npm list` (or `npm ls`): List installed packages.
- `npm search <term>`: Search the npm registry for packages.
- `npm outdated`: Check for outdated dependencies.
- `npm run <script>`: Execute a script defined in `package.json` (e.g., `npm run test`).
- `npm version <major|minor|patch>`: Bump package version.


#### Resources
- [Local Setup](https://stackoverflow.com/questions/41212558/develop-tampermonkey-scripts-in-a-real-ide-with-automatic-deployment-to-openuser)
- [Webpack](https://github.com/trim21/webpack-userscript-template?tab=readme-ov-file)