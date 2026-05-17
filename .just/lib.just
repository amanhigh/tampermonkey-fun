set quiet := true

# ── Shared tool binaries ──
eslint := "npx eslint"
tsc := "npx tsc"
prettier := "npx prettier"
npm := "npm"
root := `git rev-parse --show-toplevel`

# ── Concise-mode plumbing ──
export concise := env('concise', '0')
log_file := "/tmp/tampermonkey-fun-build.log"

# ── Print helpers (private) ──
_info task info:
    echo '{{ITALIC}}{{YELLOW}}[{{task}}]{{NORMAL}} {{info}}'

_detail task info:
    echo '{{CYAN}}[{{task}}]{{NORMAL}} {{info}}'

_title task info:
    echo '{{BOLD}}{{GREEN}}[{{task}}]{{NORMAL}} {{info}}'

_warn task info:
    echo '{{YELLOW}}[{{task}}]{{NORMAL}} {{info}}'

# ── Command runner ──
_run command:
    if [ "{{concise}}" != "1" ]; then \
        eval '{{command}}'; \
    else \
        { printf '\n=== %s ===\n' "$(date '+%Y-%m-%d %H:%M:%S')"; eval '{{command}}'; } >>'{{log_file}}' 2>&1 || { \
            just _warn "RUN" "Command failed. Last 40 log lines:"; \
            just _detail "RUN" "Detailed log: {{log_file}}"; \
            tail -n 40 '{{log_file}}' >&2 || true; \
            exit 1; \
        }; \
    fi

_run-no-output command:
    eval '{{command}}' >/dev/null 2>&1
