#!/bin/bash
# SuperSync Health Alert Script
#
# Checks container health and sends an email alert if something is wrong.
# Designed to run via cron every 5 minutes.
#
# Setup:
#   chmod +x scripts/health-alert.sh
#   crontab -e
#   */5 * * * * ALERT_EMAIL=you@example.com /path/to/super-sync-server/scripts/health-alert.sh
#
# Configuration (set these or pass via environment):
#   ALERT_EMAIL    - Email address to receive alerts (required)
#   MAIL_CMD       - mail binary to use (default: mail); a test seam
#   COMPOSE_DIR    - Path to docker-compose.yml directory (default: script directory's parent)
#   HEALTH_URL     - Health endpoint URL (default: read from .env DOMAIN)
#   MAX_QUERY_SECONDS  - Alert if any query has been active longer (default: 120)
#   POOL_WARN_PCT      - Alert if connections in use exceed this % of the pool (default: 75)
#   POSTGRES_SERVICE   - Bundled database service to health-check
#                        (default: postgres; empty: none)

# Do NOT use set -e — a monitoring script must never silently abort.
set -uo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="${COMPOSE_DIR:-$(dirname "$SCRIPT_DIR")}"
# No default recipient on purpose: this script ships in the repo and the image, so any
# default address would silently mail a self-hoster's hostname, disk usage and container
# state to whoever that address belongs to. Alerting is off until the operator opts in.
ALERT_EMAIL="${ALERT_EMAIL:-}"
MAIL_CMD="${MAIL_CMD:-mail}"
MAX_QUERY_SECONDS="${MAX_QUERY_SECONDS:-120}"
POOL_WARN_PCT="${POOL_WARN_PCT:-75}"

if [ -z "$ALERT_EMAIL" ]; then
  echo "health-alert: ALERT_EMAIL is not set, alerting is disabled." >&2
  echo "  Enable it with: ALERT_EMAIL=you@example.com $0" >&2
  exit 0
fi

CONFIG_PROBLEMS=""
DB_CONFIG_OK=true
if ! [[ "$MAX_QUERY_SECONDS" =~ ^[1-9][0-9]*$ ]] ||
  [ "${#MAX_QUERY_SECONDS}" -gt 10 ] ||
  [ "$MAX_QUERY_SECONDS" -gt 2147483647 ]; then
  CONFIG_PROBLEMS="${CONFIG_PROBLEMS}MAX_QUERY_SECONDS must be an integer from 1 to 2147483647\n"
  DB_CONFIG_OK=false
fi
if ! [[ "$POOL_WARN_PCT" =~ ^([1-9]|[1-9][0-9]|100)$ ]]; then
  CONFIG_PROBLEMS="${CONFIG_PROBLEMS}POOL_WARN_PCT must be an integer from 1 to 100\n"
  DB_CONFIG_OK=false
fi

if [ ! -f "$COMPOSE_DIR/docker-compose.yml" ]; then
  echo "ERROR: $COMPOSE_DIR does not contain docker-compose.yml" >&2
  exit 1
fi

# State file in project-local directory (not /tmp — avoids symlink attacks and tmp cleanup)
ALERT_STATE_DIR="${COMPOSE_DIR}/.health-alert"
# umask 077 makes this 0700. Later runs do not re-chmod it, so an operator can widen it to
# let a non-root deploy.sh read the markers — which is why deploy.sh sanitizes on read too.
mkdir -p "$ALERT_STATE_DIR"
ALERT_STATE_FILE="$ALERT_STATE_DIR/state"
MAIL_FAILED_FILE="$ALERT_STATE_DIR/mail-failed"
MAIL_ERR_MAX_BYTES=4096

# Record why mail could not be delivered. Line 1 is always the timestamp, so readers that
# want only that (deploy.sh) can take the first line; the reason follows. Reason text can
# originate from a remote SMTP relay and deploy.sh echoes it to a terminal, so strip
# control characters and cap the length at write time. The sed matches UTF-8-*encoded* C1
# (\xc2 followed by \x80-\x9f, which encodes U+0080-U+009F and nothing else) so CSI/OSC go
# but em-dash, NBSP and CJK survive; a plain 0x80-0x9F byte range would instead eat UTF-8
# continuation bytes and corrupt every non-ASCII message. Both halves are pinned by the
# "strips UTF-8-encoded C1 controls" spec case.
record_mail_failure() {
  {
    date -u +%Y-%m-%dT%H:%M:%SZ
    printf '%s\n' "$1" | LC_ALL=C tr -d '\000-\010\013-\037\177' |
      LC_ALL=C sed 's/\xc2[\x80-\x9f]//g' | head -c "$MAIL_ERR_MAX_BYTES"
  } > "$MAIL_FAILED_FILE"
}

# One send path for both call sites. Body on stdin; returns non-zero and records why on
# failure. Callers gate on $MAIL_AVAILABLE — see the two send conditions below.
send_alert_mail() {
  local err errfile rc
  # stderr to a FILE, never `err=$(...)`: command substitution waits for pipe EOF, so an
  # MTA that forks a delivery child survives `timeout 30` and hangs the run indefinitely
  # while holding the flock — silently killing every later cron run. stdout is discarded
  # because that is where msmtp --debug prints the SMTP dialogue, AUTH included.
  errfile="$ALERT_STATE_DIR/.mail-err"
  timeout 30 "$MAIL_CMD" -s "$1" -- "$ALERT_EMAIL" >/dev/null 2>"$errfile"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    rm -f "$errfile"
    return 0
  fi
  err=$(head -c "$MAIL_ERR_MAX_BYTES" "$errfile" 2>/dev/null)
  rm -f "$errfile"
  if [ "$rc" -eq 124 ]; then
    err="timed out after 30s${err:+: $err}"
  fi
  record_mail_failure "${err:-mail exited $rc with no error output}"
  return 1
}

# Prevent concurrent runs (cron overlap if a previous run hangs)
LOCK_FILE="$ALERT_STATE_DIR/health-alert.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  exit 0
fi

# A stock Debian/Ubuntu host has no `mail` binary, and without this check the first
# discovery of that is the first real incident, months after setup. Record it in the marker
# deploy.sh already surfaces — never in CONFIG_PROBLEMS, which is the alert body and the
# dedupe hash input: routing it there would report the broken channel through the broken
# channel and keep PROBLEMS permanently non-empty, disabling the recovery branch.
MAIL_AVAILABLE=true
if ! command -v "$MAIL_CMD" >/dev/null 2>&1; then
  MAIL_AVAILABLE=false
  echo "health-alert: no '$MAIL_CMD' binary on PATH — install mailutils or bsd-mailx." >&2
  record_mail_failure "no $MAIL_CMD binary on PATH — install mailutils or bsd-mailx"
fi

cd "$COMPOSE_DIR"

# Load domain from .env
DOMAIN=""
if [ -f ".env" ]; then
  DOMAIN=$(grep -E '^DOMAIN=' ".env" 2>/dev/null | cut -d'=' -f2 | tr -d "\"' " || true)
fi
HEALTH_URL="${HEALTH_URL:-https://${DOMAIN:-localhost}/health}"

# An explicitly empty value means the deployment uses an external database.
if [ "${POSTGRES_SERVICE+x}" != "x" ]; then
  if grep -qE '^POSTGRES_SERVICE=' ".env" 2>/dev/null; then
    POSTGRES_SERVICE=$(grep -m1 -E '^POSTGRES_SERVICE=' ".env" 2>/dev/null |
      cut -d'=' -f2- | tr -d "\"' " || true)
  else
    POSTGRES_SERVICE="postgres"
  fi
fi

PROBLEMS="$CONFIG_PROBLEMS"
DOCKER_OK=true

# 0. Check Docker daemon is accessible
if ! docker info >/dev/null 2>&1; then
  PROBLEMS="${PROBLEMS}Docker daemon is not running or not accessible!\n"
  DOCKER_OK=false
fi

if $DOCKER_OK; then
  # 1. Check if all containers are running and healthy
  SERVICES=(supersync)
  if [ -n "$POSTGRES_SERVICE" ]; then
    SERVICES+=("$POSTGRES_SERVICE")
  fi
  SERVICES+=(caddy)
  for svc in "${SERVICES[@]}"; do
    STATE=$(docker compose ps --format '{{.State}}' "$svc" 2>/dev/null || echo "missing")
    HEALTH=$(docker compose ps --format '{{.Health}}' "$svc" 2>/dev/null || echo "")
    # Guard against "<no value>" from older Docker Compose versions
    if [ "$HEALTH" = "<no value>" ]; then HEALTH=""; fi

    if [ "$STATE" != "running" ]; then
      PROBLEMS="${PROBLEMS}Container '$svc' state: ${STATE}\n"
    elif [ -n "$HEALTH" ] && [ "$HEALTH" != "healthy" ]; then
      PROBLEMS="${PROBLEMS}Container '$svc' health: ${HEALTH}\n"
    fi
  done

  # 2. Check for OOM kills via kernel log (docker OOMKilled flag resets on restart)
  OOM_HITS=$(journalctl -k --since "6 minutes ago" --no-pager 2>/dev/null \
    | grep -ciE "out of memory:|oom-kill:|oom_reaper:" || true)
  if [[ "$OOM_HITS" =~ ^[0-9]+$ ]] && [ "$OOM_HITS" -gt 0 ]; then
    PROBLEMS="${PROBLEMS}OOM kill detected in kernel log (${OOM_HITS} entries in last 6 min)\n"
  fi

  # 3. Check restart counts
  # Note: RestartCount is cumulative over the container's lifetime. It only resets on
  # docker compose down/up or --force-recreate. Threshold of 5 avoids false positives
  # from normal deploy restarts.
  for svc in "${SERVICES[@]}"; do
    CONTAINER_ID=$(docker compose ps -q "$svc" 2>/dev/null | head -1 || true)
    if [ -n "$CONTAINER_ID" ]; then
      RESTARTS=$(docker inspect --format='{{.RestartCount}}' "$CONTAINER_ID" 2>/dev/null || echo "0")
      if [[ "$RESTARTS" =~ ^[0-9]+$ ]] && [ "$RESTARTS" -gt 5 ]; then
        PROBLEMS="${PROBLEMS}Container '$svc' has restarted ${RESTARTS} times\n"
      fi
    fi
  done

  # 6-8. Query the configured database from the app container so external
  # PostgreSQL deployments use the same DATABASE_URL and Prisma client as the app.
  if $DB_CONFIG_OK; then
    DB_PROBE_JS=$(cat <<'NODE'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const maxQuerySeconds = Number(process.env.HEALTH_MAX_QUERY_SECONDS);

const readPoolLimit = () => {
  try {
    const values = new URL(process.env.DATABASE_URL ?? '').searchParams.getAll(
      'connection_limit',
    );
    if (values.length !== 1) return '';
    const [value] = values;
    const numericValue = Number(value);
    return value && /^\d+$/.test(value) && numericValue > 0 && Number.isSafeInteger(numericValue)
      ? String(numericValue)
      : '';
  } catch {
    return '';
  }
};

const main = async () => {
  console.log(`POOL_LIMIT=${readPoolLimit()}`);

  const { activity, indexes } = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL statement_timeout = 10000');
      const [activity] = await tx.$queryRawUnsafe(
        `WITH pool_sessions AS (
       SELECT CASE
         WHEN state = 'active' THEN now() - query_start
       END AS active_age,
       -- Long-running maintenance sessions are expected, so they must not page
       -- anyone -- but they still occupy a real backend, which is the resource
       -- the 2026-07-20 incident exhausted. Carrying the flag instead of
       -- filtering the CTE is what keeps them out of "longQueryCount"/"longest"
       -- while poolInUse below still counts every session.
       application_name NOT LIKE 'supersync-migrator-%'
         AND application_name <> 'supersync-monitor' AS pageable
       FROM pg_stat_activity
       WHERE state IN (
         'active',
         'idle in transaction',
         'idle in transaction (aborted)'
       )
         AND pid <> pg_backend_pid()
         AND backend_type = 'client backend'
         AND datname = current_database()
         AND usename = current_user
     )
     SELECT
       count(*) FILTER (
         WHERE pageable AND active_age > $1::integer * interval '1 second'
       )::integer AS "longQueryCount",
       COALESCE(round(extract(epoch FROM max(active_age) FILTER (WHERE pageable))), 0)::integer AS "longest",
       count(*)::integer AS "poolInUse"
     FROM pool_sessions`,
        maxQuerySeconds,
      );

      const [indexes] = await tx.$queryRawUnsafe(
        `SELECT COALESCE(
       string_agg(i.indexrelid::regclass::text, ', ' ORDER BY i.indexrelid),
       ''
     ) AS "badIndex"
     FROM pg_index i
     WHERE i.indrelid = 'operations'::regclass
       AND (NOT i.indisvalid OR NOT i.indisready OR NOT i.indislive)
       AND NOT EXISTS (
         SELECT 1
         FROM pg_stat_progress_create_index p
          WHERE p.index_relid = i.indexrelid
       )
       AND NOT EXISTS (
         SELECT 1
         FROM pg_stat_activity m
         JOIN pg_locks l
           ON l.pid = m.pid
          AND l.locktype = 'relation'
          AND l.relation = i.indexrelid
          AND l.mode = 'ShareUpdateExclusiveLock'
         WHERE m.datname = current_database()
           AND m.usename = current_user
           AND m.state = 'active'
           AND m.application_name LIKE 'supersync-migrator-%'
       )`,
      );

      return { activity, indexes };
    },
    { maxWait: 5000, timeout: 12000 },
  );

  console.log(`LONG_Q=${activity.longQueryCount}`);
  console.log(`LONGEST=${activity.longest}`);
  console.log(`POOL_IN_USE=${activity.poolInUse}`);
  console.log(`BAD_INDEX=${indexes.badIndex}`);
};

main()
  .catch((error) => {
    console.error(
      'Database probe failed:',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
NODE
)

    # Allow Prisma's 5s pool wait plus its 12s transaction bound to finish.
    DB_OUTPUT=$(timeout -k 5 20 docker compose exec -T \
      -e "HEALTH_MAX_QUERY_SECONDS=$MAX_QUERY_SECONDS" \
      supersync timeout 18 node -e "$DB_PROBE_JS" 2>/dev/null)
    DB_STATUS=$?

    LONG_Q=""
    LONGEST=""
    POOL_IN_USE=""
    POOL_LIMIT=""
    BAD_IDX=""
    HAVE_LONG_Q=false
    HAVE_LONGEST=false
    HAVE_POOL_IN_USE=false
    HAVE_POOL_LIMIT=false
    HAVE_BAD_IDX=false
    while IFS='=' read -r KEY VALUE; do
      case "$KEY" in
        LONG_Q) LONG_Q="$VALUE"; HAVE_LONG_Q=true ;;
        LONGEST) LONGEST="$VALUE"; HAVE_LONGEST=true ;;
        POOL_IN_USE) POOL_IN_USE="$VALUE"; HAVE_POOL_IN_USE=true ;;
        POOL_LIMIT) POOL_LIMIT="$VALUE"; HAVE_POOL_LIMIT=true ;;
        BAD_INDEX) BAD_IDX="$VALUE"; HAVE_BAD_IDX=true ;;
      esac
    done <<< "$DB_OUTPUT"

    if $HAVE_POOL_LIMIT && ! [[ "$POOL_LIMIT" =~ ^[1-9][0-9]*$ ]]; then
      PROBLEMS="${PROBLEMS}DATABASE_URL has no valid connection_limit\n"
    fi

    DB_RESULTS_OK=true
    if [ "$DB_STATUS" -ne 0 ] || ! $HAVE_LONG_Q || ! $HAVE_LONGEST ||
      ! $HAVE_POOL_IN_USE || ! $HAVE_POOL_LIMIT || ! $HAVE_BAD_IDX ||
      ! [[ "$LONG_Q" =~ ^[0-9]+$ ]] ||
      ! [[ "$LONGEST" =~ ^[0-9]+$ ]] ||
      ! [[ "$POOL_IN_USE" =~ ^[0-9]+$ ]]; then
      DB_RESULTS_OK=false
      PROBLEMS="${PROBLEMS}Database monitoring checks failed\n"
    fi

    if $DB_RESULTS_OK; then
      if [ "$LONG_Q" -gt 0 ]; then
        PROBLEMS="${PROBLEMS}${LONG_Q} query(s) active longer than ${MAX_QUERY_SECONDS}s (longest: ${LONGEST}s)\n"
      fi

      if [[ "$POOL_LIMIT" =~ ^[1-9][0-9]*$ ]]; then
        PCT=$(( POOL_IN_USE * 100 / POOL_LIMIT ))
        if [ "$PCT" -ge "$POOL_WARN_PCT" ]; then
          PROBLEMS="${PROBLEMS}Connection pool ${PCT}% saturated (${POOL_IN_USE} in use / ${POOL_LIMIT} limit)\n"
        fi
      fi

      if [ -n "$BAD_IDX" ]; then
        PROBLEMS="${PROBLEMS}Invalid/unusable index(es) present: ${BAD_IDX}\n"
      fi
    fi
  fi
fi

# 4. Check health endpoint (runs even if Docker is down — tests from outside)
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  PROBLEMS="${PROBLEMS}Health endpoint returned HTTP ${HTTP_CODE} (${HEALTH_URL})\n"
fi

# 5. Check disk usage
for mount_point in / /var/lib/docker; do
  if mountpoint -q "$mount_point" 2>/dev/null || [ "$mount_point" = "/" ]; then
    DISK_USAGE=$(df --output=pcent "$mount_point" 2>/dev/null | tail -1 | tr -d ' %' || true)
    if [[ "${DISK_USAGE:-0}" =~ ^[0-9]+$ ]] && [ "${DISK_USAGE:-0}" -gt 85 ]; then
      PROBLEMS="${PROBLEMS}Disk usage at ${DISK_USAGE}% on ${mount_point}\n"
    fi
  fi
done

# Normalize volatile data before hashing to prevent repeated alerts for the same issue
HASH_INPUT=$(printf '%s' "$PROBLEMS" | sed \
  's/restarted [0-9]* times/restarted N times/g
   s/([0-9]* entries/(N entries/g
   s/at [0-9]*% on/at N% on/g
   s/HTTP [0-9]*/HTTP NNN/g
   s/[0-9]* query(s) active longer than [0-9]*s (longest: [0-9]*s)/N query(s) active longer than Ns (longest: Ns)/g
   s/pool [0-9]*% saturated ([0-9]* in use \/ [0-9]* limit)/pool N% saturated (N in use \/ N limit)/g')
CURRENT_HASH=$(printf '%s' "$HASH_INPUT" | sha256sum | cut -d' ' -f1)
PREVIOUS_HASH=$(cat "$ALERT_STATE_FILE" 2>/dev/null || echo "none")

if [ -n "$PROBLEMS" ]; then
  if $MAIL_AVAILABLE && { [ "$CURRENT_HASH" != "$PREVIOUS_HASH" ] || [ -f "$MAIL_FAILED_FILE" ]; }; then
    # New or changed problem — send alert, only write state if mail succeeds
    if printf 'SuperSync health check failed at %s\n\nProblems found:\n%b\nServer: %s\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PROBLEMS" "$(hostname)" \
        | send_alert_mail "SuperSync Alert: Health Check Failed"; then
      echo "$CURRENT_HASH" > "$ALERT_STATE_FILE"
      rm -f "$MAIL_FAILED_FILE"
    else
      echo "ERROR: Failed to send alert email" >&2
    fi
  fi
else
  # A healthy retry also proves mail works again and clears a sticky failure marker.
  if $MAIL_AVAILABLE && { [ -f "$ALERT_STATE_FILE" ] || [ -f "$MAIL_FAILED_FILE" ]; }; then
    if printf 'SuperSync health check recovered at %s\n\nAll checks passing.\nServer: %s\n' \
        "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(hostname)" \
        | send_alert_mail "SuperSync OK: Health Check Recovered"; then
      rm -f "$ALERT_STATE_FILE"
      rm -f "$MAIL_FAILED_FILE"
    else
      echo "ERROR: Failed to send recovery email" >&2
    fi
  fi
fi

# Record the last completed run for deploy-time monitoring verification.
date -u +%Y-%m-%dT%H:%M:%SZ > "$ALERT_STATE_DIR/last-run"
