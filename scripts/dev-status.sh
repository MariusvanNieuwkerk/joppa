set -euo pipefail

cd "$(dirname "$0")/.."

echo "Joppa dev status"
echo "--------------"

if [ -f ".next/dev/lock" ]; then
  echo "Lock: .next/dev/lock exists"
else
  echo "Lock: (none)"
fi

for port in 3000 3001; do
  pids="$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "Port $port: LISTEN (pid(s): $pids)"
  else
    echo "Port $port: free"
  fi
done

