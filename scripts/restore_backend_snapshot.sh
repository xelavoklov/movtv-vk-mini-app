#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <target-dir>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/ops/vk-comments-backend/source"
TARGET_DIR="$1"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Backend snapshot not found: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"
rsync -a --delete --exclude '.env' --exclude '__pycache__' --exclude '*.pyc' "$SOURCE_DIR/" "$TARGET_DIR/"

if [[ ! -f "$TARGET_DIR/.env" && -f "$TARGET_DIR/.env.example" ]]; then
  cp "$TARGET_DIR/.env.example" "$TARGET_DIR/.env"
fi

cat <<EOF
Backend snapshot restored to:
  $TARGET_DIR

Next steps:
1. Open $TARGET_DIR/.env and fill in secrets.
2. Run: docker compose up -d --build
3. Check: curl http://localhost:8000/healthz
EOF
