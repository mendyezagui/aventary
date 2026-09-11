#!/usr/bin/env bash
# Resync Postgres identity sequences that have fallen behind their table's max(id).
#
# WHY THIS EXISTS:
#   Rows inserted with an explicit `id` — a CSV import, a seed file, a restore —
#   do NOT advance the table's sequence. The sequence keeps handing out ids that
#   are already taken, and the next ordinary insert dies with:
#
#       ERROR: duplicate key value violates unique constraint "<table>_pkey"
#
#   It looks like application corruption. It is not; the counter is just behind.
#   On 2026-09-10, seven tables in the Second Brain database were in this state
#   (agentlogs, company_news, events, instructions, payment_allocations, payments,
#   strategies). company_news was 30 ids behind — it would have failed 30 inserts
#   in a row before recovering on its own.
#
# WHAT IT DOES:
#   check (default)  Reports every serial/identity column whose sequence would
#                    collide on the next insert. Exits 1 if any are broken, so it
#                    can be used as a cron or CI guard.
#   --fix            setval()s each stale sequence up to max(id), then re-verifies
#                    and prints the result. Touches ZERO rows — it only moves
#                    counters forward, so it is safe to run any time, repeatedly.
#   --print          Writes the SQL to stdout instead of connecting, so you can
#                    paste it into the Supabase SQL editor.
#
# USAGE:
#   ops/resync_sequences.sh                          # check, using $DATABASE_URL
#   ops/resync_sequences.sh --fix
#   ops/resync_sequences.sh --print | pbcopy
#   ops/resync_sequences.sh --fix "postgres://..."   # or pass the URL positionally
#   SCHEMA=app ops/resync_sequences.sh               # non-public schema
#
# REQUIREMENTS:
#   - psql on PATH (not needed for --print)
#   - A direct Postgres connection string. In Supabase: Project Settings ->
#     Database -> Connection string -> URI. Use the session pooler URI on IPv4-only
#     networks. The pooler in transaction mode is fine here; nothing uses prepared
#     statements or holds state across statements.
#
# RUN IT AFTER: any bulk import, seed, restore, or manual insert that supplied its
# own id values. Or just wire the check into cron and forget about it.
#
set -euo pipefail

MODE="check"
DB="${DATABASE_URL:-}"
SCHEMA="${SCHEMA:-public}"

for arg in "$@"; do
  case "$arg" in
    --fix)    MODE="fix" ;;
    --print)  MODE="print" ;;
    --check)  MODE="check" ;;
    -h|--help) sed -n '2,45p' "$0"; exit 0 ;;
    *)        DB="$arg" ;;
  esac
done

# Every serial/identity column in the schema, with its sequence's real position.
# is_called matters: a sequence at last_value=1 with is_called=false hands out 1,
# not 2, so `last_value = max(id)` is broken in that case and fine in the other.
# pg_sequences does not expose is_called, so it is read from the sequence itself
# via query_to_xml (dynamic SQL inside a plain read-only query).
read -r -d '' REPORT_SQL <<'SQL' || true
with seqs as (
  select n.nspname sch, c.relname tbl, a.attname col,
         pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) seq
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where n.nspname = :'schema' and c.relkind = 'r'
    and pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) is not null
),
j as (
  select s.tbl, s.col,
    (xpath('/row/m/text()', query_to_xml(
        format('select max(%I) as m from %I.%I', s.col, s.sch, s.tbl), false, true, '')))[1]::text::bigint max_id,
    (xpath('/row/last_value/text()', query_to_xml(
        format('select last_value, is_called from %s', s.seq), false, true, '')))[1]::text::bigint last_value,
    (xpath('/row/is_called/text()', query_to_xml(
        format('select last_value, is_called from %s', s.seq), false, true, '')))[1]::text::boolean is_called
  from seqs s
)
select tbl as "table", col as "column", max_id as "max id",
       last_value + case when is_called then 1 else 0 end as "next id",
       case
         when max_id is null then 'empty'
         when last_value + case when is_called then 1 else 0 end > max_id then 'ok'
         else 'BROKEN'
       end as status,
       case when max_id is not null
             and last_value + case when is_called then 1 else 0 end <= max_id
            then max_id - (last_value + case when is_called then 1 else 0 end) + 1
       end as "failed inserts until it recovers"
from j
order by (case when max_id is not null
                and last_value + case when is_called then 1 else 0 end <= max_id
               then 0 else 1 end), tbl;
SQL

# Same predicate, reduced to a single number so the exit code can key off it.
read -r -d '' COUNT_SQL <<'SQL' || true
with seqs as (
  select n.nspname sch, c.relname tbl, a.attname col,
         pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) seq
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where n.nspname = :'schema' and c.relkind = 'r'
    and pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) is not null
)
select count(*) from seqs s
where (xpath('/row/m/text()', query_to_xml(
         format('select max(%I) as m from %I.%I', s.col, s.sch, s.tbl), false, true, '')))[1]::text::bigint
      is not null
  and (xpath('/row/last_value/text()', query_to_xml(
         format('select last_value, is_called from %s', s.seq), false, true, '')))[1]::text::bigint
      + case when (xpath('/row/is_called/text()', query_to_xml(
         format('select last_value, is_called from %s', s.seq), false, true, '')))[1]::text::boolean
        then 1 else 0 end
      <= (xpath('/row/m/text()', query_to_xml(
         format('select max(%I) as m from %I.%I', s.col, s.sch, s.tbl), false, true, '')))[1]::text::bigint;
SQL

# setval(seq, max(id), true) -> next nextval() returns max(id)+1. Never lowers a
# sequence, so a healthy one is left alone; empty tables are skipped entirely.
read -r -d '' FIX_SQL <<'SQL' || true
do $$
declare r record; mx bigint;
begin
  for r in
    select n.nspname sch, c.relname tbl, a.attname col,
           pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) seq
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where n.nspname = current_setting('resync.schema') and c.relkind = 'r'
      and pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) is not null
  loop
    execute format('select max(%I) from %I.%I', r.col, r.sch, r.tbl) into mx;
    if mx is not null then
      perform setval(r.seq, mx, true);
      raise notice 'resynced %.% -> next id %', r.sch, r.tbl, mx + 1;
    end if;
  end loop;
end $$;
SQL

if [ "$MODE" = "print" ]; then
  printf -- '-- Sequence resync. Schema is hardcoded to public here; edit if needed.\n'
  printf -- '-- 1) REPORT what is broken:\n\n%s\n\n' \
    "${REPORT_SQL//:\'schema\'/\'public\'}"
  printf -- '-- 2) FIX it (touches no rows), then re-run the report above:\n\n'
  printf -- "set resync.schema = 'public';\n%s\n" "$FIX_SQL"
  exit 0
fi

if [ -z "$DB" ]; then
  echo "error: no connection string. Set DATABASE_URL or pass one as an argument." >&2
  echo "       Supabase: Project Settings -> Database -> Connection string -> URI" >&2
  exit 2
fi

command -v psql >/dev/null 2>&1 || {
  echo "error: psql not found on PATH. Use --print and paste into the SQL editor instead." >&2
  exit 2
}

count_broken() {
  psql "$DB" -tAX -v ON_ERROR_STOP=1 -v schema="$SCHEMA" -c "$COUNT_SQL" | tr -d '[:space:]'
}

if [ "$MODE" = "fix" ]; then
  echo "==> before"
  psql "$DB" -X -v ON_ERROR_STOP=1 -v schema="$SCHEMA" -c "$REPORT_SQL"
  echo "==> resyncing schema '$SCHEMA'"
  psql "$DB" -X -v ON_ERROR_STOP=1 \
    -c "set resync.schema = '$SCHEMA';" -c "$FIX_SQL"
  echo "==> after"
fi

psql "$DB" -X -v ON_ERROR_STOP=1 -v schema="$SCHEMA" -c "$REPORT_SQL"

BROKEN="$(count_broken)"
if [ "${BROKEN:-0}" -gt 0 ]; then
  echo "FAIL: $BROKEN sequence(s) still behind. Re-run with --fix." >&2
  exit 1
fi

echo "OK: every sequence in '$SCHEMA' is ahead of its table."
