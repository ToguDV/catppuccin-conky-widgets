#!/bin/bash
# Launch this Conky window from its own directory so the relative
# paths in conkyrc work from any install location.
cd "$(dirname "$0")" || exit 1

# Optional extra disk to monitor, e.g. export DATA_DISK=/mnt/datos
export DATA_DISK="${DATA_DISK:-}"

# nvm installs node outside the system PATH; add it if `node` is not found.
if ! command -v node >/dev/null 2>&1; then
  latest=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -n 1)
  [ -n "$latest" ] && PATH="$latest:$PATH"
fi

exec conky -c "$PWD/conkyrc" "$@"
