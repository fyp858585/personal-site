#!/usr/bin/env bash
# 果园工坊 · 编程三消 —— 本地静态服务
#   ./dev.sh        默认 8170
#   ./dev.sh 8180   指定端口
set -euo pipefail
cd "$(dirname "$0")"

PORT="${1:-8170}"
URL="http://127.0.0.1:${PORT}/"

if lsof -ti "tcp:${PORT}" >/dev/null 2>&1; then
  # 只有确认是本游戏才直接打开，避免 8160 那种“端口被别的站占了”
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 1 "$URL" 2>/dev/null | grep -q '果园工坊'; then
    echo "→ 已经在运行：${URL}"
    open "$URL" 2>/dev/null || true
    exit 0
  fi
  echo "→ ${PORT} 端口被其他程序占用。"
  echo "  换一个端口：./dev.sh 8180"
  exit 1
fi

echo "→ 果园工坊 · 编程三消：${URL}"
echo "  （Ctrl-C 停止）"
( sleep 0.8; open "$URL" >/dev/null 2>&1 || true ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
