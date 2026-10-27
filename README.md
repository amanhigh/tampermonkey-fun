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
- **Command**: `just install [project]` — builds every production userscript plus the development build of the selected project, then serves that output. The builds run quietly, so if either one fails the recipe stops before printing any URL or starting the server; rerun `just bundle all production` or `just bundle <project> development` to see the full webpack diagnostics. The project defaults to `barkat` in the recipe.
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
The Seer userscript runs on `http://seerr.media.lan/*` and on `https://www.airtelxstream.in/*`. Only the Seerr origin gets the panel; the Airtel Xstream origin only gets the marked search assistant described in [Seer Xstream Search](#seer-xstream-search).

-   **Origin selection**: exactly one handler runs per page — the panel on the Seerr origin, the search assistant on the Airtel Xstream origin. On any other origin neither handler runs.
-   **Notifications only from own failures**: Seer registers no global `error` or `unhandledrejection` handler, so host-page errors (such as Airtel Xstream's React hydration warnings) stay console-only. Only failures Seer catches itself are reported through the shared `Notifier`.
-   **Panel and route polling**: the panel is mounted once, and one local 400 ms poll of the live pathname shows it only on `/movie/{id}` and `/tv/{id}`, hides it elsewhere and removes it on `pagehide`. The poll only keeps the panel and Delete visibility current; the read-only media-record check behind that visibility is specified in [Seer Deletion](#seer-deletion), and nothing is opened or deleted on load.
-   **Captured on click**: each button acts on the pathname captured when it is clicked and resolves its own target fresh at that moment; Delete additionally requires the route to be media-record verified as described in [Seer Deletion](#seer-deletion). Search never waits for that visibility. The two buttons share nothing beyond this panel; each section below is authoritative for its own button.

## Seer Xstream Search
The authoritative description of the search button (labelled `▶️ Xtreme`) and of the search assistant it arms.

-   **Supported route required**: a click on any other live route does nothing — no lookup, no tab and no notification.
-   **Title fallback**: the first usable title of the Seer detail response is searched on Airtel Xstream — `title` then `originalTitle` for movies, `name` then `originalName` for tv, trimmed with blank values skipped. The title is resolved fresh on every click; nothing is preloaded.
-   **One active tab**: the search opens in a foreground tab that keeps the Seer tab as its parent, and nothing else is opened.
-   **Duplicate prevention**: the button disables itself and shows `Opening Xstream…` until the lookup and the tab open settle, so extra clicks meanwhile are ignored. Delete keeps its own busy state, so neither button blocks the other.
-   **Stale results stay silent**: when the pathname changed or the page exited during the lookup, no tab opens, no notification is shown and the button returns to idle.
-   **Escaped failures**: a failed lookup or tab open shows one escaped error notification naming the route for 8 s, and only while that route is still live. No retry, timer or background polling runs during that lookup phase.
-   **Marked search url only**: the assistant runs only on Airtel Xstream `/search?q=…#seer-auto`. It consumes the fragment once with `history.replaceState`, keeping the query and the history state, and ignores every other origin, route, fragment or blank `q`.
-   **One title, immediate match and node observation**: after arming, the rendered results are matched against that one `q` title at once, then again whenever a node is added or removed below the document root, through a single node observer built with `childList` + `subtree`. A single 15 s deadline is the only timer: its final check reports the outcome when no result appeared meanwhile. Attribute changes and character-data changes are mutations too, but this node observer does not watch them, so such a change only triggers a match when a node addition or removal follows, or at the deadline. No polling and no retry runs.
-   **Unique result wins**: when exactly one rendered grid or hero result matches the title (or its decoded slug, ignoring case, accents and punctuation), the tab navigates to that Airtel detail url with `location.replace`, so the back button does not return to the search page.
-   **Manual fallback**: when no single result matches, the assistant navigates nowhere and shows one escaped notice asking for a manual pick. A match failure shows one escaped error instead and leaves the search page in place.
-   **Independent tabs**: each marked search tab decides for itself from its own url; there is no storage, cache or cross-tab coordination.
-   **Cancelled by the user**: editing the search box, selecting a grid or hero result, `pagehide`, `popstate` and `hashchange` cancel the pending match and release its timer, observer and listeners. A click is never intercepted, and a changed live url cancels the pending match.
-   **Out of scope**: search only opens the Airtel Xstream search page and follows its unique result; it never deletes and never touches Seer media state.


## Seer Deletion
The authoritative description of what the Delete button does.

-   **On click, not on load**: the deletion target is read fresh from the pathname captured when the button is clicked. The read-only media-record check on route entry never reads a deletion target and changes nothing.
-   **Delete visibility**: Delete is mounted hidden and shown only while the live route is a detail route whose read-only media-record check resolved true; a false result leaves it silently hidden. That check counts a record as present only when the detail response carries a `mediaInfo` object with a valid positive integer `mediaInfo.id`: an absent `mediaInfo`, a `null` `mediaInfo`, and a missing or `null` id all report absence and keep Delete hidden, while a malformed payload, a non-numeric id or a non-positive id rejects like any other failure. Each route entry the 400 ms poll observes runs that check exactly once, an unchanged route never refetches even after a failure, and an unsupported route hides the panel without any lookup. A rejection shows one escaped error naming the route for 8 s and is not retried. Results belong to the route entry that started them: a route change — including returning to the same route — or `pagehide` discards stale successes and failures, and Delete is hidden again before the next route's check. The poll can only react to route changes it detects, so a request added while the page stays on the same detail route is not noticed: reload the page, or leave the route and return, to run the check again — no periodic server refresh runs.
-   **One confirmation**: the button asks once, generically, that the deletion is irreversible, before the deletion target is read and any mutation is sent. A click is ignored while the live pathname is not the verified route entry of the page. Cancelling or failing restores the idle button; the button stays disabled from the confirmation until the outcome and any pending refresh are settled, so a click while that is running is ignored.
-   **Order (Arr-first)**: library files are removed first — Seer drives the configured Radarr/Sonarr services to delete them for every available variant — then the media requests, then the media entry itself last.
-   **File failures stop the record cleanup**: when any variant's file deletion fails (including a 404), no request and no media entry is deleted, and the failure is reported in an error notification. Nothing is rolled back.
-   **Record cleanup continues past individual failures**: a request or media entry that is already gone (404, direct or wrapped) counts as cleaned up, other errors are collected, every remaining step is still attempted, and the aggregated failure is reported in one error notification once the attempts finish.
-   **Transport**: every call goes through the shared `BaseClient` (`GM.xmlHttpRequest`) against `Constants.SEER.BASE_URL`; there is no Seer-specific request code, so error statuses and empty delete bodies behave like every other client.
-   **Confirmed route wins over navigation**: after the confirmation the captured route is deleted even if the SPA moves to another page, and the outcome feedback is labelled as described in **Notifications, not dialogs** below. A success on the captured route shows its notification immediately and refreshes the page 2 s later; the refresh is skipped when the pathname is no longer that route or the page is left during the delay, and the button then returns to idle. A success after navigating away only notifies and schedules no refresh, and an error never refreshes.
-   **Notifications, not dialogs**: exactly two outcomes are reported through the shared `Notifier`, which renders HTML, so both messages are escaped. A success reads `Deleted "{title}". Library files, requests and media entry removed.` and appends ` The page will refresh.` only while the captured route is still live; a failure reads `Deletion failed for "{title}": {error}` and stays 8 s. `{title}` is taken from the captured route by the title-resolution rules of [Seer Xstream Search](#seer-xstream-search), resolved once after the confirmation and before the first deletion call. When that title lookup fails, the captured pathname is used as the label and the deletion still runs.
-   **Page exit cannot guarantee completion**: `pagehide` removes the panel and its polling, discards any pending visibility check, and suppresses later feedback, but a deletion already in flight is not cancelled and may still complete server-side. This is not tab visibility: switching tabs or backgrounding the page does not signal `pagehide`.
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
