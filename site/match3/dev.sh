#!/usr/bin/env bash
# 起一个本地静态服务并打开浏览器
#   ./dev.sh        默认 8150
#   ./dev.sh 8080   指定端口
set -euo pipefail
cd "$(dirname "$0")"

PORT="${1:-8150}"
URL="http://127.0.0.1:${PORT}/"

if lsof -ti "tcp:${PORT}" >/dev/null 2>&1; then
  echo "→ ${PORT} 端口已在运行，直接打开：${URL}"
  open "$URL" 2>/dev/null || true
  exit 0
fi

echo "→ 果园消消乐：${URL}"
echo "  （Ctrl-C 停止）"
( sleep 0.8; open "$URL" >/dev/null 2>&1 || true ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
