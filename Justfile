set shell := ["bash", "-cu"]

import './.just/lib.just'

# ── Default ──
[doc('Show available recipes')]
default:
    just --list

# ── Format & Quality ──
[group('core')]
[doc('Format TypeScript files with Prettier')]
format:
    just _title "FORMAT" "TypeScript"
    {{prettier}} --write "src/**/*.ts"

[group('core')]
[doc('Run TypeScript compilation check')]
compile dir="":
    just _title "COMPILE" "TypeScript"
    @if [ -n "{{dir}}" ]; then \
        {{tsc}} --noEmit "src/{{dir}}/**/*.ts"; \
    else \
        {{tsc}} --noEmit; \
    fi

[group('quality')]
[doc('Run ESLint on all files')]
lint:
    just _title "LINT" "ESLint"
    {{eslint}} .

[group('core')]
[doc('Format, compile, and lint')]
build: format compile lint
    just _title "BUILD" "Complete"

# ── Test ──
[group('quality')]
[doc('Run Jest test suite')]
test:
    just _title "TEST" "Jest"
    {{npm}} run test

# ── Build scripts ──
[group('run')]
[doc('Bundle userscripts with webpack (all projects, production mode by default)')]
bundle project="all" mode="production":
    {{webpack}} --env project={{quote(project)}} --mode {{quote(mode)}}

[group('run')]
[doc('Build and serve all userscripts for local installation')]
install: bundle
    just _title "BUILD" "Install"
    just _detail "OPEN" "http://127.0.0.1:8765/barkat.user.js"
    just _detail "OPEN" "http://127.0.0.1:8765/imdb.user.js"
    just _detail "OPEN" "http://127.0.0.1:8765/picasso.user.js"
    just _detail "OPEN" "http://127.0.0.1:8765/seer.user.js"
    just _info "STOP" "Press Ctrl+C to stop the local server"
    python3 -m http.server 8765 --bind 127.0.0.1 --directory dist/install

[group('run')]
[doc('Build and watch a userscript (dev)')]
dev project="barkat":
    just _title "BUILD" "Dev"
    just _info "CSP" "https://chromewebstore.google.com/detail/disable-content-security/ieelmcmcagommplceebfedjlakkhpden?pli=1"
    just _info "MAIN"  "src/core/{{project}}.ts"
    just _detail "DEBUG" "dist/index.debug.js"
    just _detail "DEV"   "dist/index.dev.user.js"
    {{webpack}} --env project={{quote(project)}} --mode development --watch

# ── Setup ──
[group('setup')]
_setup-npm:
    just _title "SETUP" "NPM"
    {{npm}} ci

[group('setup')]
[doc('One-time NPM setup')]
prepare: _setup-npm

[group('setup')]
[doc('Build, test, and run dev watcher')]
setup: build test dev

# ── Clean ──
[group('clean')]
_clean-node:
    just _title "CLEAN" "Build Artifacts"
    rm -rf dist node_modules

[group('clean')]
[doc('Remove dist and node_modules')]
clean: _clean-node

[group('setup')]
[doc('Clean and rebuild everything')]
reset: clean _setup-npm setup
    just _info "RESET" "Clean build complete"
