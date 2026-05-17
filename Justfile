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
[doc('Build experiment userscript (dev)')]
experiment:
    just _title "BUILD" "Experiment"
    just _info "CSP" "https://chromewebstore.google.com/detail/disable-content-security/ieelmcmcagommplceebfedjlakkhpden?pli=1"
    just _info "MAIN"  "src/core/experiment.ts (Keep only one)"
    just _detail "DEBUG" "dist/index.dev.user.js"
    just _detail "PROD"  "dist/index.prod.user.js"
    {{npm}} run experiment

[group('run')]
[doc('Build Barkat userscript')]
barkat:
    just _title "BUILD" "Barkat"
    {{npm}} run barkat

[group('run')]
[doc('Build IMDB userscript')]
imdb:
    just _title "BUILD" "IMDB"
    {{npm}} run imdb

[group('run')]
[doc('Build Picasso userscript')]
picasso:
    just _title "BUILD" "Picasso"
    {{npm}} run picasso

[group('run')]
[doc('Analyze bundle size')]
analyze:
    just _title "ANALYZE" "Bundle"
    {{npm}} run analyze

# ── Setup ──
[group('setup')]
_setup-npm:
    just _title "SETUP" "NPM"
    {{npm}} install

[group('setup')]
[doc('One-time NPM setup')]
prepare: _setup-npm

[group('setup')]
[doc('Build, test, and run experiment')]
setup: build test experiment

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
reset: clean setup
    just _info "RESET" "Clean build complete"

[group('setup')]
[doc('Full bootstrap: prepare + reset')]
all: prepare reset

# ── Misc ──
[group('info')]
[doc('Show project info')]
info:
    just _title "INFO" "tampermonkey-fun"
    just _detail "SCRIPTS" "experiment, barkat, imdb, picasso"
    just _detail "TEST"    "jest"
    just _detail "LINT"    "eslint + prettier"

[group('info')]
infos: info
