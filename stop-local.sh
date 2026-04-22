#!/bin/bash
# Stops all ResumeAI services started by start-local.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT/logs/pids.txt"

echo ""
echo "🛑 Stopping ResumeAI services..."

if [ ! -f "$PID_FILE" ]; then
  echo "   No PID file found. Killing all dotnet + vite processes..."
  pkill -f "dotnet run" 2>/dev/null && echo "   dotnet ✓" || echo "   (no dotnet processes)"
  pkill -f "vite"       2>/dev/null && echo "   vite ✓"   || echo "   (no vite processes)"
else
  while read -r pid name; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && echo "   ✓ stopped $name (PID $pid)"
    else
      echo "   ⚠️  $name was already stopped"
    fi
  done < "$PID_FILE"
  rm "$PID_FILE"
  # also kill vite
  pkill -f "vite" 2>/dev/null && echo "   ✓ stopped React (vite)" || true
fi

echo "   Done 🐾"
echo ""
