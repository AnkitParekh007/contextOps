#!/usr/bin/env bash
# Phase 11 CI-only PostgreSQL recovery evidence. Uses synthetic ephemeral CI data.
# DO NOT execute against production or an environment that contains real customer records.
set -euo pipefail

cid="${PG_CONTAINER_ID:?Set PG_CONTAINER_ID to the synthetic CI postgres service container}"
user="contextops"
source_db="contextops"
restore_db="contextops_ci_recovery"
dump="/tmp/contextops_ci_recovery.dump"

cleanup(){
  docker exec "$cid" dropdb -U "$user" --if-exists --force "$restore_db" >/dev/null 2>&1 || true
  docker exec "$cid" rm -f "$dump" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Fresh scratch DB, not a mutation of the source database.
docker exec "$cid" dropdb -U "$user" --if-exists --force "$restore_db"
docker exec "$cid" pg_dump -U "$user" -d "$source_db" -Fc -f "$dump"
docker exec "$cid" pg_restore -l "$dump" > /dev/null
docker exec "$cid" createdb -U "$user" "$restore_db"
docker exec "$cid" pg_restore -U "$user" -d "$restore_db" \
  --no-owner --no-privileges "$dump"

table_exists="$(docker exec "$cid" psql -U "$user" -d "$restore_db" -Atc \
  "SELECT to_regclass('public.\"AuthSession\"') IS NOT NULL")"
if [[ "$table_exists" != "t" ]]; then
  echo "FAIL: Revocable-session table missing from recovered database" >&2
  exit 1
fi
source_users="$(docker exec "$cid" psql -U "$user" -d "$source_db" -Atc 'SELECT count(*) FROM "User"')"
restored_users="$(docker exec "$cid" psql -U "$user" -d "$restore_db" -Atc 'SELECT count(*) FROM "User"')"
source_sessions="$(docker exec "$cid" psql -U "$user" -d "$source_db" -Atc 'SELECT count(*) FROM "AuthSession"')"
restored_sessions="$(docker exec "$cid" psql -U "$user" -d "$restore_db" -Atc 'SELECT count(*) FROM "AuthSession"')"
if [[ "$source_users" != "$restored_users" || "$source_sessions" != "$restored_sessions" ]]; then
  echo "FAIL: Recovery row-count mismatch" >&2
  exit 1
fi
if [[ "$source_users" -lt 1 || "$source_sessions" -lt 1 ]]; then
  echo "FAIL: Backup drill requires nonempty synthetic CI fixtures" >&2
  exit 1
fi
echo "Phase 11 PostgreSQL recovery PASS: custom-format dump restored to isolated scratch database; schema and synthetic account/session counts verified"
