# Phase 1 — applied 2026-09-11

**313 rows moved from A into B, under tenant `0a7225ba-7625-4881-8d8f-237424282b3b`.
Every row verified byte-for-byte against A. Nothing that already existed in B changed.**

Applied as tracked migrations on `fukehjqikxqsntwhmgsk`, not as ad-hoc SQL, so there is
a permanent server-side record of every write:

| Migration | Rows |
|---|---:|
| `merge_a_into_b_phase1_campaign_5` | 1 |
| `merge_a_into_b_phase1_project_10013_deal_18` | 1 |
| `merge_a_into_b_phase1_project_10013` | 1 |
| `merge_a_into_b_phase1_companies` | 37 |
| `merge_a_into_b_phase1_tasks_394_425` | 32 |
| `merge_a_into_b_phase1_tasks_426_457` | 32 |
| `merge_a_into_b_phase1_tasks_458_489` | 32 |
| `merge_a_into_b_phase1_contacts_whatsapp_group` | 29 |
| `merge_a_into_b_phase1_contacts_235_300` | 66 |
| `merge_a_into_b_phase1_contacts_301_383` | 83 |
| `merge_a_into_b_phase1_fix_stale_project_crossref` | (1 update) |

`execute_sql` is read-only on these projects, so `apply_migration` was the write path.
That turned out better than planned: each step is in B's migration history.

## Final counts — all exactly on target

| Table | Before | Moved | After | Expected |
|---|---:|---:|---:|---:|
| campaigns | 4 | 1 | **5** | 5 |
| companies | 135 | 37 | **172** | 172 |
| contacts | 199 | 178 | **377** | 377 |
| deals | 11 | 1 | **12** | 12 |
| projects | 18 | 1 | **19** | 19 |
| tasks | 348 | 96 | **444** | 444 |

## Verification

**1. Nothing pre-existing changed.** Re-hashing B's rows in the pre-merge id ranges
returns exactly the fingerprints captured in `00_prestate.md` before any write:

| Table | md5 before | md5 after |
|---|---|---|
| campaigns | `261d9d98593cba30da98dcb7e5229666` | **identical** |
| companies | `675f8e70ede8af2eef6a75d1e63a58a0` | **identical** |
| contacts | `0aa2efa252bc165fbd877bbb64b565c6` | **identical** |
| deals | `4f6dd6506e89584a6eeb676ddb3fdcc7` | **identical** |
| projects | `21ac74fcf9f7816bb8c06a92c26cc352` | **identical** |
| tasks | `79c205522e3f3a19115aa9c7f92e0868` | **identical** |

**2. Every moved row matches A byte-for-byte.** Hashes computed over all columns on
both sides, with the id map applied on the A side:

| Set | Rows | md5 (A, remapped) | md5 (B) |
|---|---:|---|---|
| companies 135–171 → 136–171, 173 | 37 | `df26d4a1f63bb9630d2cc677b4af1497` | **match** |
| tasks 394–489 | 96 | `fd828f8515a0b8309ed7f26ec2b512b1` | **match** |
| contacts 206–383 → 209–383, 385–387 | 178 | `2532a62901a3c644fe41332911fd36b4` | **match** |
| campaign 5 / deal 18 / project 10013 | 3 | notes md5 + length | **match** |

**3. No orphaned foreign keys introduced.** Four orphans exist in B (tasks 2, 4, 5, 10
pointing at projects/contacts/deals 1, 4, 5). All are in the pre-merge id range and are
covered by the unchanged hashes above — they are original seed-data artifacts, not ours.

**4. No sequences to resync.** None of the six tables has a sequence or default on `id`;
the app assigns ids client-side.

## The one deliberate divergence from A

Deal 18's notes ended "See project 10010" — the project's id in **A**. In B that id is
the Rambam leaderboard, so the reference pointed at an unrelated record. Corrected to
10013 in `merge_a_into_b_phase1_fix_stale_project_crossref`, applied **after** the
byte-for-byte verification so the check above is still meaningful. No other moved text
referenced a remapped id (checked across deals, tasks and projects).

## Rollback

`99_rollback.sql` still applies unchanged: it deletes exactly the ids added and
re-asserts the pre-merge counts and hashes. The cross-reference fix above is not undone
by it — re-apply `See project 10010.` by hand if you ever roll back.

## What this does NOT do

**A is not disposable.** Phase 1 covered the seven core CRM tables. Still in A only:
27 tables (3,175 rows) with no equivalent in B, 26 populated columns across 10 shared
tables, and ~1,000 rows of delta in shared tables — `agentlogs` (735), `events` (142),
`cadence_enrollments` (95), `payment_allocations` (30). See `second-brain-schema-gap.md`.

Do not switch A off. When the time comes, set it read-only rather than dropping it.
