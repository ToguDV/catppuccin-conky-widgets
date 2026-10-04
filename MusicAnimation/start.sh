#!/bin/bash
# Launch this Conky window from its own directory so the relative
# paths in conkyrc work from any install location.
cd "$(dirname "$0")" || exit 1

# nvm installs node outside the system PATH; add it if `node` is not found.
if ! command -v node >/dev/null 2>&1; then
  latest=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -n 1)
  [ -n "$latest" ] && PATH="$latest:$PATH"
fi

CONF="$PWD/conkyrc"

# Conky 1.19 can abort with a BadWindow X error when it starts before the
# desktop window exists (e.g. from autostart at login). When running in the
# background (-d), launch it, wait, and retry until it survives startup.
if printf '%s\n' "$@" | grep -qx -- '-d'; then
  # Nothing to do if this widget is already running.
  pgrep -f -- "$CONF" >/dev/null 2>&1 && exit 0

  for _ in $(seq 1 10); do
    conky -c "$CONF" "$@" >/dev/null 2>&1
    sleep 3
    pgrep -f -- "$CONF" >/dev/null 2>&1 && exit 0
  done

  echo "$CONF: conky failed to start (desktop not ready?)" >&2
  exit 1
fi

exec conky -c "$CONF" "$@"
