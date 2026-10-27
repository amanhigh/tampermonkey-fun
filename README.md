# tampermonkey-fun

[![Build](https://github.com/amanhigh/tampermonkey-fun/actions/workflows/ci.yml/badge.svg)](https://github.com/amanhigh/tampermonkey-fun/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/amanhigh/tampermonkey-fun/branch/master/graph/badge.svg)](https://codecov.io/gh/amanhigh/tampermonkey-fun)

Experiment and Useful Grease/TamperMonkey Scripts.

## Debug
For debugging, run `just setup [project]` — it runs the quality gates and the test suite, then builds and watches one userscript in development mode. With no argument it defaults to `barkat`, set directly in the Justfile recipe; pass a project to override it:
-   `just setup` — watch the default (`barkat`)
-   `just setup imdb` / `just setup picasso` / `just setup seer` — watch that app
-   `just setup experiment` — watch [`src/core/experiment.ts`](src/core/experiment.ts:1), the scratch file for ad-hoc experiments

No source edit is needed to switch targets: each core file is a standalone entry point, so the project passed to `just setup` selects what gets built (see [Build](#build)). The recipe prints the entry file plus the two artifacts it writes: `dist/debug/<project>.js` (the watched code) and `dist/install/<project>.dev.user.js` (the header-only wrapper that `@require`s it).

**Install first, then watch.** Production and development builds share the `dist/install` directory and have separate webpack caches, so never run a one-shot build (`just bundle`, `just install`) while a `just setup` watcher is running:
1.  `just install barkat` (or another project) and install from the served URLs — see [Local Installation](#local-installation).
2.  Press `Ctrl+C` to stop the installation server.
3.  `just setup barkat` and keep the watcher running while you debug.

To load the development build in Tampermonkey, grant the userscript access to `file://` URLs. The installed wrapper is `dist/install/<project>.dev.user.js` and its header requires the watched bundle, e.g. for `barkat`:
```javascript
// @require     file:///home/aman/Projects/tampermonkey-fun/dist/debug/barkat.js
```
Tampermonkey installs that wrapper for hot reloading, while `dist/debug/barkat.js` holds the watched code. The debug file must exist and stay readable on disk for the development build to run; the watcher only adds automatic rebuilds and page reloads. Production scripts have no such dependency and keep working once the installation server is stopped.

## Build
Recipes are split by responsibility, not by app:
-   **Quality gates**: `just format`, `just compile`, `just lint` and `just test` each do one job. `just build` stays the combination `format` + `compile` + `lint` and does not run tests.
-   **Bundling**: `just bundle` runs webpack once, without watching or serving. It defaults to every production userscript with `just bundle all`, builds a single project with `just bundle imdb`, and produces a one-shot development build with `just bundle experiment development`. `experiment` is an ordinary production project like the others — development is a per-project build mode, not a separate scratch entry point. `just build` has no dependency on bundling.

All userscripts come from one webpack factory ([`config/webpack.config.cjs`](config/webpack.config.cjs)) with shared metadata ([`config/metadata.cjs`](config/metadata.cjs)) and an empty header-only entry ([`config/empty.cjs`](config/empty.cjs)). Because the same factory emits every artifact, delivery is not a separate build mode — [Local Installation](#local-installation) only builds and serves that output.

CI (`.github/workflows/ci.yml`) runs the same recipes in sequence:
-   **Build and lint**: `just build` — the format, compile and lint combination from the quality-gates list above — so CI applies the same gates as local development.
-   **Bundling**: `just bundle` for every production userscript plus the `barkat` one-shot development build.
-   **Tests**: the test suite runs after bundling and uploads coverage.

## Local Installation
The authoritative path for installing the built userscripts locally without editing any source file.
- **Entry Points**: each core file is its own entry point and self-starts only when bundled directly; importing it (e.g. from `src/core/experiment.ts`) just exposes its classes and `Run*` function, so no source edit is needed.
- **Command**: `just install [project]` — builds every production userscript in one webpack run, adds the development build of the selected project, then serves that output. The project defaults to `barkat` in the recipe.
- **Install**: open one of the served URLs and confirm the install in Tampermonkey. Production builds:
  - `http://127.0.0.1:8765/barkat.user.js`
  - `http://127.0.0.1:8765/experiment.user.js`
  - `http://127.0.0.1:8765/imdb.user.js`
  - `http://127.0.0.1:8765/picasso.user.js`
  - `http://127.0.0.1:8765/seer.user.js`

  and the development build of the selected project, e.g. `http://127.0.0.1:8765/barkat.dev.user.js` for `just install barkat` (see [Debug](#debug) for what that build needs to keep working).
- **Same script, no coexistence**: a production build and the development build of the same project declare the same script name and namespace, so installing one replaces the other rather than keeping both. Reinstall the variant you want by rerunning `just install [project]` and opening its URL again — do not uninstall first. Tampermonkey keeps the script's storage across a reinstall, so existing state survives the switch; confirm the result in the browser after each swap.
- **Confirmation**: the Tampermonkey dashboard lists the script under the name declared in its metadata.
- **Manual reinstall**: the script version is unchanged between builds, so reinstall manually — rerun `just install` and open the same URL again (stop the running server first, see **Stop** below).
- **Stop**: press `Ctrl+C`. The server is only needed for installation, so installed scripts keep executing without it; what a development build additionally requires is covered in [Debug](#debug).
- **Fallback**: Tampermonkey Dashboard → Utilities → Import from URL → paste the same URL.
- **Permissions**: no userscript file-URL access is needed for the production URLs; the development wrapper does need it (see [Debug](#debug)). Normal userscript execution permissions for the target sites are still required either way.

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

## Seer Sidekick
The Seer userscript runs only on `http://seerr.media.lan/*` and adds two buttons to `movie` and `tv` detail pages: **Search Xstream**, documented in [Seer Xstream Search](#seer-xstream-search), and **Delete**, documented in [Seer Deletion](#seer-deletion). Each section is the authoritative description of its own button; the two buttons never share state beyond the panel that hosts them.

## Seer Xstream Search
The authoritative description of the Search Xstream button.

-   **On click, not on load**: navigating never resolves a title, never calls the Seer API and never opens a tab. The single local visibility poll (400 ms) that governs the panel shows or hides the buttons, and the search target is resolved only when Search Xstream is clicked, from the pathname captured at that moment — before the next poll.
-   **Supported route required**: the click does nothing on a live pathname that is not `/movie/{id}` or `/tv/{id}`; no lookup, no tab and no notification.
-   **Title to Xstream url**: the manager canonicalizes the captured route (`/movie/{tmdbId}` or `/tv/{id}`) and reads the first usable title of the Seer detail endpoint — `title` then `originalTitle` for movies, `name` then `originalName` for tv — trimmed, skipping blank and non-string values. The title is resolved fresh on every click (no cache, no storage, no preload) and URL-encoded into `Constants.SEER.AIRTEL_BASE_URL` as `https://www.airtelxstream.in/search?q=…`.
-   **One foreground tab**: the resolved url is opened with `GM.openInTab(url, { active: true, setParent: true })`, so the search replaces the Seer tab in focus while keeping that tab as its parent. Nothing else is opened.
-   **Independent busy button**: Search Xstream disables itself and shows `Opening Xstream…` from the click until the lookup and the tab open settle, ignoring clicks meanwhile. Delete keeps its own busy state, so neither button blocks the other.
-   **Stale route closes the door**: when the pathname changed or the page exited (`pagehide`) while the lookup was running, no tab opens, no notification is shown and the button returns to idle.
-   **Reported, not retried**: a rejected lookup or a rejected `GM.openInTab` shows one escaped error notification (`Seer Xstream search failed for {route}: {message}`, 8 s) only while the captured route is still live. There are no timers, retries or background refreshes.
-   **Out of scope**: search only opens the Airtel Xstream search page; it never deletes, never resolves a deletion target and never touches the Seer media state.

## Seer Deletion
The authoritative description of what the Delete button does.

-   **On click, not on load**: navigating never resolves a deletion target or calls the Seer API. The same local visibility poll (400 ms) over the live pathname shows or hides the buttons, and the deletion target is resolved fresh only when the Delete button is clicked, from the pathname captured at that moment.
-   **One confirmation**: the button asks once, generically, that the deletion is irreversible, before any request is sent. Cancelling or failing restores the idle button; the button stays disabled from the confirmation until the outcome and any pending refresh are settled, so a click while that is running is ignored.
-   **Order (Arr-first)**: library files are removed first — Seer drives the configured Radarr/Sonarr services to delete them for every available variant — then the media requests, then the media entry itself last.
-   **File failures stop the record cleanup**: when any variant's file deletion fails (including a 404), no request and no media entry is deleted, and the failure is reported in an error notification. Nothing is rolled back.
-   **Record cleanup continues past individual failures**: a request or media entry that is already gone (404, direct or wrapped) counts as cleaned up, other errors are collected, every remaining step is still attempted, and the aggregated failure is reported in one error notification once the attempts finish.
-   **Transport**: every call goes through the shared `BaseClient` (`GM.xmlHttpRequest`) against `Constants.SEER.BASE_URL`; there is no Seer-specific request code, so error statuses and empty delete bodies behave like every other client.
-   **Confirmed route wins over navigation**: after the confirmation the captured route is deleted even if the SPA moves to another page, and all feedback names that route. A success on the captured route shows its notification immediately and refreshes the page 2 s later; the refresh is skipped when the pathname is no longer that route or the page is left during the delay, and the button then returns to idle. A success after navigating away only notifies and schedules no refresh, and an error never refreshes.
-   **Notifications, not dialogs**: outcomes are reported through the shared `Notifier` (escaped, since it renders HTML); the error notification stays 8 s.
-   **Page exit cannot guarantee completion**: `pagehide` removes the panel and its polling and suppresses later feedback, but a deletion already in flight is not cancelled and may still complete server-side. This is not tab visibility: switching tabs or backgrounding the page does not signal `pagehide`.
-   **Out of scope**: no direct torrent client calls; deletion stays on the Seer API. Opening the Airtel Xstream search is the separate [Seer Xstream Search](#seer-xstream-search) button.

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