#!/usr/bin/env bash
#
# BunnyMetrics — run every check this project has, in order, from a clean slate.
#
#   ./scripts/verify.sh
#
# This is the same pipeline CI runs. It is destructive to the local SQLite
# database: it re-seeds demo data, so any sites you created by hand in
# `prisma/dev.db` will be removed.
#
# Requires: Node 18.18+, pnpm (via corepack), and curl.

set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
BASE="http://localhost:${PORT}"
SERVER_PID=""
FAILURES=0

# Colours, only when writing to a terminal.
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; BOLD=$'\033[1m'; DIM=$'\033[2m'; OFF=$'\033[0m'
else
  RED=""; GREEN=""; BOLD=""; DIM=""; OFF=""
fi

step()  { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$OFF"; }
ok()    { printf '%s    ok%s   %s\n' "$GREEN" "$OFF" "$1"; }
fail()  { printf '%s    FAIL%s %s\n' "$RED" "$OFF" "$1"; FAILURES=$((FAILURES + 1)); }
info()  { printf '%s         %s%s\n' "$DIM" "$1" "$OFF"; }

# Resolve the package manager: prefer pnpm, fall back to npm.
if command -v pnpm > /dev/null 2>&1; then
  PM=pnpm
elif command -v corepack > /dev/null 2>&1; then
  PM="corepack pnpm"
else
  PM=npm
fi

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2> /dev/null; then
    kill "$SERVER_PID" 2> /dev/null || true
    wait "$SERVER_PID" 2> /dev/null || true
    info "stopped server (pid $SERVER_PID)"
  fi
}
trap cleanup EXIT INT TERM

printf '%sBunnyMetrics verification%s  %s(%s)%s\n' "$BOLD" "$OFF" "$DIM" "$PM" "$OFF"

# --- 1. environment ---------------------------------------------------------
step "Environment"
if [ ! -f .env ]; then
  info "no .env found — copying from .env.example"
  cp .env.example .env
fi
node -v
$PM --version

# --- 2. install -------------------------------------------------------------
step "Install dependencies"
$PM install --frozen-lockfile || $PM install
ok "dependencies installed"

# --- 3. database ------------------------------------------------------------
step "Database"
$PM prisma generate
$PM prisma db push --skip-generate --accept-data-loss
ok "schema pushed"

# --- 4. static checks -------------------------------------------------------
step "Typecheck"
if $PM tsc --noEmit; then ok "no type errors"; else fail "tsc reported errors"; fi

step "Lint"
if $PM next lint --max-warnings=200; then ok "no lint warnings or errors"; else fail "lint failed"; fi

step "Tracking script budget"
if node scripts/check-tracking-size.mjs; then ok "within budget"; else fail "tracking.js over budget"; fi

step "Source encoding"
if node scripts/check-encoding.mjs; then ok "no BOMs in source files"; else fail "stray UTF-8 BOM"; fi

# --- 5. build ---------------------------------------------------------------
step "Build"
if $PM build; then ok "production build succeeded"; else fail "build failed"; exit 1; fi

step "Prerender bailout guard"
if node scripts/check-bailout.mjs; then ok "static pages fully server-rendered"; else fail "CSR bailout detected"; fi

step "Seed demo data"
if $PM db:seed; then ok "demo data loaded"; else fail "seed failed"; fi

step "libSQL driver adapter parity"
# Runs the real adapter against a copy of the seeded database and asserts the
# storage format, the strftime bucketing and every range's totals are identical
# to the classic engine. This is what catches a Turso deployment silently
# collecting traffic the dashboard cannot see.
if $PM verify:libsql; then ok "adapter matches the classic engine"; else fail "libSQL adapter diverged"; fi

# --- 6. seed + serve + test -------------------------------------------------
step "Start production server on :${PORT}"
$PM start -p "$PORT" > server.log 2>&1 &
SERVER_PID=$!

READY=0
for i in $(seq 1 60); do
  if curl -sf "$BASE" > /dev/null 2>&1; then
    READY=1
    ok "server ready after ${i}s"
    break
  fi
  # Bail out early if the server process already died.
  if ! kill -0 "$SERVER_PID" 2> /dev/null; then
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  fail "server did not become ready within 60s"
  info "--- server.log ---"
  cat server.log 2> /dev/null || true
  exit 1
fi

step "API smoke tests"
if BASE="$BASE" node scripts/smoke-test.mjs; then ok "smoke tests passed"; else fail "smoke tests failed"; fi

step "Dashboard render tests"
if BASE="$BASE" node scripts/dashboard-test.mjs; then ok "dashboard tests passed"; else fail "dashboard tests failed"; fi

# --- adapter transport -------------------------------------------------------
# Runs the same API suite a second time with TURSO_DATABASE_URL pointed at a
# real libSQL file, which is the transport Vercel uses in production. libSQL
# opens ordinary SQLite files, so this needs no Turso account and no network.
ADAPTER_PORT="${ADAPTER_PORT:-$((${PORT} + 1))}"
ADAPTER_BASE="http://localhost:${ADAPTER_PORT}"
# Deliberately RELATIVE to the repo root. Git Bash hands back MSYS-style
# absolute paths (/tmp/...) that native Node on Windows cannot open, so an
# absolute temp path fails on Windows while passing on Linux. A relative path
# resolves natively on both.
ADAPTER_DIR=".verify-adapter"
ADAPTER_REL="$ADAPTER_DIR/adapter.db"

step "Start adapter-backed server on :${ADAPTER_PORT}"
cleanup_adapter() {
  if [ -n "${ADAPTER_PID:-}" ] && kill -0 "$ADAPTER_PID" 2> /dev/null; then
    kill "$ADAPTER_PID" 2> /dev/null || true
    wait "$ADAPTER_PID" 2> /dev/null || true
    info "stopped adapter server (pid $ADAPTER_PID)"
  fi
  if [ -n "${ADAPTER_DIR:-}" ] && [ -d "$ADAPTER_DIR" ]; then
    rm -rf "$ADAPTER_DIR" 2> /dev/null || true
  fi
}

if [ -f prisma/dev.db ]; then
  rm -rf "$ADAPTER_DIR" 2> /dev/null || true
  mkdir -p "$ADAPTER_DIR"
  cp prisma/dev.db "$ADAPTER_REL"

  TURSO_DATABASE_URL="file:./$ADAPTER_REL" \
  TURSO_AUTH_TOKEN="" \
  NEXTAUTH_URL="$ADAPTER_BASE" \
  NEXT_PUBLIC_APP_URL="$ADAPTER_BASE" \
  DATABASE_URL="file:./$ADAPTER_REL" \
    $PM start -p "$ADAPTER_PORT" > server-adapter.log 2>&1 &
  ADAPTER_PID=$!
  trap 'cleanup; cleanup_adapter' EXIT INT TERM

  READY=0
  for i in $(seq 1 60); do
    if curl -sf "$ADAPTER_BASE" > /dev/null 2>&1; then
      READY=1
      ok "adapter server ready after ${i}s"
      break
    fi
    if ! kill -0 "$ADAPTER_PID" 2> /dev/null; then break; fi
    sleep 1
  done

  if [ "$READY" -ne 1 ]; then
    fail "adapter server did not become ready"
    info "--- server-adapter.log ---"
    cat server-adapter.log 2> /dev/null || true
  else
    step "API smoke tests (libSQL adapter)"
    if BASE="$ADAPTER_BASE" node scripts/smoke-test.mjs; then
      ok "smoke tests passed on the adapter"
    else
      fail "smoke tests failed on the adapter"
    fi
  fi
else
  fail "prisma/dev.db missing — cannot exercise the adapter transport"
fi

# --- summary ----------------------------------------------------------------
printf '\n%s%s%s\n' "$BOLD" "────────────────────────────────────────" "$OFF"
if [ "$FAILURES" -eq 0 ]; then
  printf '%s%sAll checks passed.%s\n' "$GREEN" "$BOLD" "$OFF"
  exit 0
fi

printf '%s%s%d check(s) failed.%s\n' "$RED" "$BOLD" "$FAILURES" "$OFF"
exit 1
