#!/bin/bash
# Usage: wttr-line.sh <line> [column-range]
# Shows one line of the wttr.in block (?0T), cached for 15 min.
# If wttr.in cannot be refreshed, falls back to open-meteo data (weather.js).
CACHE=/tmp/wttr.txt
FB=/tmp/wttr-fallback.txt
TTL=900

if [ ! -f "$CACHE" ] || [ $(( $(date +%s) - $(stat -c %Y "$CACHE") )) -ge $TTL ]; then
  exec 9>/tmp/wttr.lock
  if flock 9; then
    if [ ! -f "$CACHE" ] || [ $(( $(date +%s) - $(stat -c %Y "$CACHE") )) -ge $TTL ]; then
      curl -sf --max-time 10 "wttr.in/?0T" 2>/dev/null | sed 1,2d > /tmp/wttr.tmp
      if [ -s /tmp/wttr.tmp ]; then
        mv /tmp/wttr.tmp "$CACHE"
      else
        ./weather.js --fallback-block > /tmp/wttr-fb.tmp 2>/dev/null && mv /tmp/wttr-fb.tmp "$FB"
      fi
    fi
    flock -u 9
  fi
fi

if [ -s "$CACHE" ] && [ $(( $(date +%s) - $(stat -c %Y "$CACHE") )) -lt $TTL ]; then
  src="$CACHE"
elif [ -s "$FB" ] && [ $(( $(date +%s) - $(stat -c %Y "$FB") )) -lt $TTL ]; then
  src="$FB"
else
  src="$CACHE"
fi

[ -f "$src" ] && sed -n "${1}p" "$src" | cut -c"${2:-1-}"
