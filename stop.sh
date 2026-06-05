#!/usr/bin/env bash
#
# 停止「微信公众号 AI 推文系统」
#
#   ./stop.sh            仅停止应用（保留 PostgreSQL，它是系统级服务）
#   ./stop.sh --with-db  同时停止 PostgreSQL 服务
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

PORT=13819
PG_SERVICE="postgresql@16"
PID_FILE=".run/app.pid"

# ---- 1. 停止应用：按端口杀进程，最可靠 ----
PIDS="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  echo "▶ 停止应用（端口 $PORT，PID: $PIDS）..."
  # shellcheck disable=SC2086
  kill $PIDS 2>/dev/null || true
  # 等待优雅退出，最多 5 秒
  for _ in $(seq 1 5); do
    PIDS="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
    [ -z "$PIDS" ] && break
    sleep 1
  done
  # 仍未退出则强杀
  PIDS="$(lsof -ti "tcp:$PORT" 2>/dev/null || true)"
  if [ -n "$PIDS" ]; then
    echo "  优雅退出超时，强制结束..."
    # shellcheck disable=SC2086
    kill -9 $PIDS 2>/dev/null || true
  fi
  echo "✓ 应用已停止"
else
  echo "✓ 应用未在运行（端口 $PORT 空闲）"
fi

# 顺带清掉可能残留的 npm 父进程
if [ -f "$PID_FILE" ]; then
  PARENT="$(cat "$PID_FILE")"
  kill "$PARENT" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

# ---- 2. 可选：停止 PostgreSQL ----
if [ "${1:-}" = "--with-db" ]; then
  echo "▶ 停止 PostgreSQL ($PG_SERVICE)..."
  brew services stop "$PG_SERVICE" >/dev/null || true
  echo "✓ PostgreSQL 已停止"
else
  echo "ℹ PostgreSQL 仍在运行（系统级服务）。如需停止：./stop.sh --with-db"
fi
