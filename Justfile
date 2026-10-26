set shell := ["bash", "-cu"]

import './.just/lib.just'

# ── Help ──
[doc('Show available recipes')]
help:
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
[doc('Build every production userscript plus the selected development build, then serve them')]
install project="barkat": (bundle "all" "production") (bundle project "development")
    just _title "BUILD" "Install"
    just _detail "PROD" "http://127.0.0.1:8765/barkat.user.js"
    just _detail "PROD" "http://127.0.0.1:8765/experiment.user.js"
    just _detail "PROD" "http://127.0.0.1:8765/imdb.user.js"
    just _detail "PROD" "http://127.0.0.1:8765/picasso.user.js"
    just _detail "PROD" "http://127.0.0.1:8765/seer.user.js"
    just _detail "DEV"  "http://127.0.0.1:8765/{{project}}.dev.user.js"
    just _info "STOP" "Press Ctrl+C to stop the local server"
    python3 -m http.server 8765 --bind 127.0.0.1 --directory dist/install

# ── Setup ──
[group('setup')]
_setup-npm:
    just _title "SETUP" "NPM"
    {{npm}} ci

[group('setup')]
[doc('One-time NPM setup')]
prepare: _setup-npm

[group('setup')]
[doc('Build, test, then build and watch the selected userscript')]
setup project="barkat": build test
    just _title "BUILD" "Setup"
    just _info "MAIN" "src/core/{{project}}.ts"
    just _detail "DEBUG" "dist/debug/{{project}}.js"
    just _detail "DEV" "dist/install/{{project}}.dev.user.js"
    {{webpack}} --env project={{quote(project)}} --mode development --watch

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
