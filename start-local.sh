#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# ResumeAI — local dev start script (no Docker needed)
# Runs all 9 services in the background, logs go to ./logs/
# Usage:  ./start-local.sh
# Stop:   ./stop-local.sh
# ─────────────────────────────────────────────────────────────────

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG="$ROOT/logs"
mkdir -p "$LOG"

# ── Path setup ────────────────────────────────────────────────────
export PATH="/opt/homebrew/opt/dotnet@8/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
export DOTNET_ROOT="/opt/homebrew/opt/dotnet@8/libexec"

# ── Shared JWT config ─────────────────────────────────────────────
export Jwt__Secret="LOCAL_DEV_SECRET_MIN_32_CHARS_LONG_HERE"
export Jwt__Issuer="ResumeAI"
export Jwt__Audience="ResumeAI-Clients"

# ── Postgres (brew local — no password, uses your Mac username) ───
PG_USER="$(whoami)"
export ConnectionStrings__AuthDb="Host=localhost;Database=resumeai_auth;Username=$PG_USER;"
export ConnectionStrings__ResumeDb="Host=localhost;Database=resumeai_resume;Username=$PG_USER;"
export ConnectionStrings__SectionDb="Host=localhost;Database=resumeai_section;Username=$PG_USER;"
export ConnectionStrings__AiDb="Host=localhost;Database=resumeai_ai;Username=$PG_USER;"
export ConnectionStrings__TemplateDb="Host=localhost;Database=resumeai_template;Username=$PG_USER;"
export ConnectionStrings__ExportDb="Host=localhost;Database=resumeai_export;Username=$PG_USER;"
export ConnectionStrings__JobMatchDb="Host=localhost;Database=resumeai_jobmatch;Username=$PG_USER;"
export ConnectionStrings__NotificationDb="Host=localhost;Database=resumeai_notification;Username=$PG_USER;"

# ── Redis & RabbitMQ ──────────────────────────────────────────────
export Redis__ConnectionString="localhost:6379"
export RabbitMQ__Host="localhost"
export RabbitMQ__Username="guest"
export RabbitMQ__Password="guest"

# ── AI keys (fill these in if you have them) ──────────────────────
export OpenAI__ApiKey="${OPENAI_API_KEY:-sk-placeholder}"
export Anthropic__ApiKey="${ANTHROPIC_API_KEY:-sk-placeholder}"

# ── OAuth (fill these in for OAuth testing) ───────────────────────
export OAuth__Google__ClientId="${GOOGLE_CLIENT_ID:-placeholder}"
export OAuth__Google__ClientSecret="${GOOGLE_CLIENT_SECRET:-placeholder}"
export OAuth__LinkedIn__ClientId="${LINKEDIN_CLIENT_ID:-placeholder}"
export OAuth__LinkedIn__ClientSecret="${LINKEDIN_CLIENT_SECRET:-placeholder}"

# ─────────────────────────────────────────────────────────────────
# Helper: start one service in background
# Usage: start_service <display-name> <project-path> <port>
# ─────────────────────────────────────────────────────────────────
PID_FILE="$ROOT/logs/pids.txt"
> "$PID_FILE"   # clear on each start

start_service() {
  local name="$1"
  local path="$2"
  local port="$3"
  local log="$LOG/${name}.log"

  echo "  🚀 Starting $name on :$port"
  ASPNETCORE_URLS="http://localhost:$port" \
    dotnet run --project "$ROOT/src/$path" \
    --no-launch-profile \
    > "$log" 2>&1 &

  local pid=$!
  echo "$pid $name" >> "$PID_FILE"
  echo "     PID $pid → logs/$name.log"
}

# ─────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       ResumeAI — Local Dev Start         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "📦 Restoring NuGet packages (first run only)..."
dotnet restore "$ROOT/ResumeAI.sln" --verbosity quiet
echo "   Done ✓"
echo ""
echo "🔧 Starting services..."

start_service "auth"         "ResumeAI.Auth.API/ResumeAI.Auth.API.csproj"               5001
start_service "resume"       "ResumeAI.Resume.API/ResumeAI.Resume.API.csproj"           5002
start_service "section"      "ResumeAI.Section.API/ResumeAI.Section.API.csproj"         5003
start_service "ai"           "ResumeAI.AI.API/ResumeAI.AI.API.csproj"                   5004
start_service "template"     "ResumeAI.Template.API/ResumeAI.Template.API.csproj"       5005
start_service "export"       "ResumeAI.Export.API/ResumeAI.Export.API.csproj"           5006
start_service "jobmatch"     "ResumeAI.JobMatch.API/ResumeAI.JobMatch.API.csproj"       5007
start_service "notification" "ResumeAI.Notification.API/ResumeAI.Notification.API.csproj" 5008
start_service "gateway"      "ResumeAI.Gateway/ResumeAI.Gateway.csproj"                 5000

echo ""
echo "⏳ Waiting 15s for services to boot..."
sleep 15

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                   ResumeAI is up!                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Gateway      →  http://localhost:5000               ║"
echo "║  Auth API     →  http://localhost:5001/swagger       ║"
echo "║  Resume API   →  http://localhost:5002/swagger       ║"
echo "║  Section API  →  http://localhost:5003/swagger       ║"
echo "║  AI API       →  http://localhost:5004/swagger       ║"
echo "║  Template API →  http://localhost:5005/swagger       ║"
echo "║  Export API   →  http://localhost:5006/swagger       ║"
echo "║  JobMatch API →  http://localhost:5007/swagger       ║"
echo "║  Notif API    →  http://localhost:5008/swagger       ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  RabbitMQ UI  →  http://localhost:15672 (guest/guest)║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  To stop:  ./stop-local.sh                           ║"
echo "║  Logs:     ./logs/<service>.log                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Starting React UI..."
cd "$ROOT/src/ResumeAI.React"
npm install --silent
npm run dev &
echo "  ⚛️  React → http://localhost:3000"
echo ""
echo "All done! Open http://localhost:3000 in your browser 🐾"
