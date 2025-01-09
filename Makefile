### Variables
.DEFAULT_GOAL := help
OUT := /dev/null

### Build Tools
ESLINT := npx eslint
TSC := npx tsc
WEBPACK := webpack
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

debug: ## Debug bundle using webpack
	@printf $(_TITLE) "Bundle" "Debug"
	$(WEBPACK) --config config/webpack.config.dev.cjs

format: ## Format TypeScript files using prettier
	@printf $(_TITLE) "Format" "TypeScript"
	$(PRETTIER) --write "src/**/*.ts"

## Misc
.PHONY: pack
pack: ## Repomix Packing
	@printf $(_TITLE) "Pack" "Repository"
	@repomix --style markdown . --ignore "LICENSE,gradlew,app/src/test"


### Basic
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
	printf $(_TITLE) "FirstTime: prepare/all, OUT=/dev/stdout (Debug) "

### Workflows
info: ## Info
infos: info ## Extended Info
prepare: ## Onetime Setup
setup: compile lint format ## Setup
clean: ## Clean
reset: clean setup info ## Reset
all:prepare reset ## Run All Targets

### Formatting
_INFO := "\033[33m[%s]\033[0m %s\n"  # Yellow text for "printf"
_DETAIL := "\033[34m[%s]\033[0m %s\n"  # Blue text for "printf"
_TITLE := "\033[32m[%s]\033[0m %s\n" # Green text for "printf"
_WARN := "\033[31m[%s]\033[0m %s\n" # Red text for "printf"