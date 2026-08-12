#!/bin/bash
# Usage: wttr-line.sh <line> [column-range]
# Extracts one line from the current wttr.in block (curl ?0T), cached for 1 hour.
CACHE=/tmp/wttr.txt
if [ ! -f "$CACHE" ] || [ $(( $(date +%s) - $(stat -c %Y "$CACHE") )) -ge 3600 ]; then
  curl -s --max-time 10 "wttr.in/?0T" 2>/dev/null | sed 1,2d > /tmp/wttr.tmp
  [ -s /tmp/wttr.tmp ] && mv /tmp/wttr.tmp "$CACHE"
fi
[ -f "$CACHE" ] && sed -n "${1}p" "$CACHE" | cut -c"${2:-1-}"
