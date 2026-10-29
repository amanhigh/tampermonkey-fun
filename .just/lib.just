set quiet := true

# ── Shared tool binaries ──
eslint := "npm exec --no -- eslint"
tsc := "npm exec --no -- tsc"
prettier := "npm exec --no -- prettier"
npm := "npm"
webpack := "npm exec --no -- webpack --config config/webpack.config.cjs"

# ── Print helpers (private) ──
_info task info:
    echo '{{ITALIC}}{{YELLOW}}[{{task}}]{{NORMAL}} {{info}}'

_detail task info:
    echo '{{CYAN}}[{{task}}]{{NORMAL}} {{info}}'

_title task info:
    echo '{{BOLD}}{{GREEN}}[{{task}}]{{NORMAL}} {{info}}'

# ── Command runner ──
_run-no-output command:
    eval {{quote(command)}} >/dev/null 2>&1
