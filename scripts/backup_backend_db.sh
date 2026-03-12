#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-dir> [container-name] [db-name] [db-user]"
  exit 1
fi

BACKUP_DIR="$1"
CONTAINER_NAME="${2:-vk-comments-backend-db-1}"
DB_NAME="${3:-vkapp}"
DB_USER="${4:-vkapp}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"
