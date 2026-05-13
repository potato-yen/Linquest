# Migration Notes

This file records append-only migration history that is easy to misread when
searching by function name. Do not rewrite pushed migrations; add a newer
migration and update this note when a definition is superseded.

## Superseded RPC Definitions

| Function | Original migration | Current / superseding migration | Note |
|---|---|---|---|
| `public.get_activity_dashboard(uuid)` | `20260512100300_teacher_console_rpc_dashboard.sql` | `20260512100600_teacher_console_review_round_2.sql` | Round 2 redefined the full dashboard RPC to fix numeric group-name ordering. |
| `public.settle_activity(uuid)` | `20260510112000_territory_settle_activity.sql`, `20260510124500_territory_round2_polish.sql` | `20260512100600_teacher_console_review_round_2.sql` | Round 2 made settlement idempotent for non-active activities and clears active challenge / battle locks. |

## Privilege Hardening

| Migration | Purpose |
|---|---|
| `20260513100000_rpc_execute_privilege_hardening.sql` | Revokes default `PUBLIC` execute on SECURITY DEFINER RPCs and re-grants only intended caller roles. In particular, `public.settle_activity(uuid)` is service-role only. |
| `20260513100100_grouping_helper_stable_shuffle.sql` | Redefines `public.compute_balanced_groups(uuid[], integer)` so `array_agg` orders by its own shuffle key instead of relying on subquery order preservation. |
