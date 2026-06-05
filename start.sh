#!/usr/bin/env bash
#
# 启动「微信公众号 AI 推文系统」
#
#   ./start.sh         生产模式启动（缺少构建产物时自动 build）
#   ./start.sh build   强制重新构建后再启动（生产模式）
#   ./start.sh dev      开发模式启动（热更新，无需 build）
#
set -euo pipefail

# ---- 切到项目根目录（脚本所在目录）----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 确保能找到 Homebrew 安装的 postgres 工具
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

PORT=13819
PG_SERVICE="postgresql@16"
RUN_DIR=".run"
PID_FILE="$RUN_DIR/app.pid"
LOG_FILE="$RUN_DIR/app.log"
MODE="${1:-prod}"

mkdir -p "$RUN_DIR"

# ---- 1. 确保 PostgreSQL 就绪 ----
if pg_isready -q -h localhost -p 5432 2>/dev/null; then
  echo "✓ PostgreSQL 已在运行"
else
  echo "▶ PostgreSQL 未运行，正在启动 $PG_SERVICE ..."
  brew services start "$PG_SERVICE" >/dev/null
  for _ in $(seq 1 30); do
    if pg_isready -q -h localhost -p 5432 2>/dev/null; then break; fi
    sleep 1
  done
  if pg_isready -q -h localhost -p 5432 2>/dev/null; then
    echo "✓ PostgreSQL 已就绪"
  else
    echo "✗ PostgreSQL 启动超时，请手动检查：brew services list"
    exit 1
  fi
fi

# ---- 2. 检查是否已在运行 ----
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "⚠ 应用已在运行 (PID $(cat "$PID_FILE"))，访问 http://localhost:$PORT"
  echo "  如需重启请先执行 ./stop.sh"
  exit 0
fi
if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
  echo "⚠ 端口 $PORT 已被占用，请先执行 ./stop.sh"
  exit 1
fi

# ---- 3. 启动应用 ----
case "$MODE" in
  dev)
    echo "▶ 开发模式启动（热更新）..."
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    ;;
  build)
    echo "▶ 重新构建生产版本..."
    npm run build
    echo "▶ 生产模式启动..."
    nohup npm run start > "$LOG_FILE" 2>&1 &
    ;;
  prod)
    if [ ! -f ".next/BUILD_ID" ]; then
      echo "▶ 未发现构建产物，先执行 build ..."
      npm run build
    fi
    echo "▶ 生产模式启动..."
    nohup npm run start > "$LOG_FILE" 2>&1 &
    ;;
  *)
    echo "✗ 未知模式：$MODE（可选：prod / build / dev）"
    exit 1
    ;;
esac

echo $! > "$PID_FILE"

# ---- 4. 等待端口起来 ----
echo -n "  等待服务就绪 "
for _ in $(seq 1 30); do
  if lsof -ti "tcp:$PORT" >/dev/null 2>&1; then
    echo ""
    echo "✓ 启动成功 → http://localhost:$PORT"
    echo "  日志：$LOG_FILE （tail -f $LOG_FILE 查看）"
    exit 0
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "✗ 服务在 30 秒内未监听端口 $PORT，请查看日志：$LOG_FILE"
exit 1
