set -euo pipefail

cd "$(dirname "$0")/.."

echo "Restarting Joppa dev server…"

bash ./scripts/dev-stop.sh

# Clean stale lock if present (safe when no dev server is running)
rm -f .next/dev/lock

echo "Starting on http://localhost:3000"
npm run dev -- -p 3000

