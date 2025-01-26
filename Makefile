### Variables
.DEFAULT_GOAL := help
OUT := /dev/null

### Build Tools
ESLINT := npx eslint
TSC := npx tsc
PRETTIER := npx prettier
NPM := npm

### Build Commands
lint: ## Run ESLint on all files
	@printf $(_TITLE) "Lint" "TypeScript"
	$(ESLINT) .

compile: ## Run TypeScript compilation with optional directory (usage: make compile [DIR=manager])
	@printf $(_TITLE) "Compile" "TypeScript"
	@if [ "$(DIR)" ]; then \
		$(TSC) --noEmit "src/$(DIR)/**/*.ts"; \
	else \
		$(TSC) --noEmit; \
	fi

build: format compile lint ## Build all files
	@printf $(_TITLE) "Build" "TypeScript"

test: ## Run tests
	@printf $(_TITLE) "Test" "TypeScript"
	$(NPM) run test

format: ## Format TypeScript files using prettier
	@printf $(_TITLE) "Format" "TypeScript"
	$(PRETTIER) --write "src/**/*.ts" > $(OUT)

## Run
experiment: ## Run Experiment
	@printf $(_TITLE) "Run" "Experiment"
	@printf $(_INFO) "Disable CSP" "https://chromewebstore.google.com/detail/disable-content-security/ieelmcmcagommplceebfedjlakkhpden?pli=1"
	@printf $(_INFO) "Main Switch" "src/core/experiment.ts (Keep only one)"
	@printf $(_DETAIL) "Debug Script" "dist/index.dev.user.js"
	@printf $(_DETAIL) "Prod Script" "dist/index.prod.user.js"
	$(NPM) run experiment

barkat: ## Run Barkat
	@printf $(_TITLE) "Run" "Barkat"
	$(NPM) run barkat

imdb: ## Run IMDB Script
	@printf $(_TITLE) "Run" "IMDB"
	$(NPM) run imdb

## Setup
setup-npm:
	@printf $(_TITLE) "Setup" "NPM"
	$(NPM) install

## Clean
clean-node:
	@printf $(_TITLE) "Clean" "Build"
	rm -rf dist node_modules

## Misc
.PHONY: pack test
pack: ## Repomix Packing
	@printf $(_TITLE) "Pack" "Repository"
	@repomix --style markdown . --ignore "LICENSE"

### Basic
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
	printf $(_TITLE) "FirstTime: prepare/all, OUT=/dev/stdout (Debug) "

### Workflows
info: ## Info
infos: info ## Extended Info
prepare: setup-npm ## Onetime Setup
setup: build test barkat ## Setup
clean: clean-node ## Clean
reset: clean setup info ## Reset
all:prepare reset ## Run All Targets

### Formatting
_INFO := "\033[33m[%s]\033[0m %s\n"  # Yellow text for "printf"
_DETAIL := "\033[34m[%s]\033[0m %s\n"  # Blue text for "printf"
_TITLE := "\033[32m[%s]\033[0m %s\n" # Green text for "printf"
_WARN := "\033[31m[%s]\033[0m %s\n" # Red text for "printf"