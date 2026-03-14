# Migration audit

Audit date: 2026-03-14. Covers all `supabase/migrations/*.sql` and app usage of the database.

## Summary

| Migration | Purpose | Status |
|-----------|---------|--------|
| 001 | Baseline schema (tables, triggers, indexes, realtime) | OK |
| 002 | Pairing rule + skill gap columns | OK (see note) |
| 003 | Replica identity FULL for Realtime | OK |
| 004 | RLS on users (initial; superseded by 005) | OK |
| 005 | RLS on users (corrected for app_user_id) | OK |
| 006 | Grants for `authenticated` on `users` | OK |
| 007 | Grants for `authenticated` on other tables | OK |
| 008 | Grants for `service_role` on `users` (auth callback) | OK |
| 009 | DELETE on `users` for `service_role` (moderator delete player) | **Added** |

One additional migration was added: **009** grants `DELETE ON public.users TO service_role` so moderator delete-player (unlinked name-slot users) works.

---

## Role usage

- **authenticated**: Server and browser clients after login (JWT). Used for all normal app queries; RLS on `users` restricts rows.
- **service_role**: Admin client only (auth callback, moderator “create name-slot user”, moderator “delete unlinked player”, TrueSkill updates). Bypasses RLS; needs explicit table grants.
- **anon**: Not used for app table access (login page only uses auth.getUser()).

---

## Table-level grants

### `public.users`

| Role           | 006/007 | 008 | 009 | Used for |
|----------------|---------|-----|-----|----------|
| authenticated  | SELECT, UPDATE | — | — | RLS-limited read/update own or moderator |
| service_role   | —       | SELECT, INSERT, UPDATE | DELETE | Callback upsert; name-slot insert (players route); delete unlinked (players/[id]); TrueSkill update (results route) |

### Other tables (`sessions`, `session_players`, `pairings`, `game_results`, `moderator_default_session_settings`)

- **authenticated**: 007 grants SELECT/INSERT/UPDATE/DELETE as needed. All app writes go through API routes with auth checks; no RLS on these tables.
- **service_role**: Only used for `users` (see above). No admin client usage on other tables, so no extra grants.

---

## RLS

- **users**: RLS enabled (004); policies in 005 use `current_app_user_id()` and `current_user_is_moderator()` (JWT `app_user_id`), not `auth.uid()`.
- **Other tables**: No RLS. Access controlled in API routes (is_moderator, session membership). Workspace rule says “RLS on all tables”; extending RLS to other tables would be a separate, larger change.

---

## Realtime

- 001: `sessions`, `session_players`, `pairings`, `game_results` added to `supabase_realtime` publication.
- 003: Same four tables set to `REPLICA IDENTITY FULL` so `payload.old` is populated for UPDATE/DELETE. Table names in 003 are unqualified; they resolve to `public.*` with default search_path.

---

## Notes

1. **001 vs 002**: 001 is a collapsed baseline (comment says “001–013”). If you apply 001 then 002, 002’s `CREATE TYPE public.pairing_rule` can conflict if 001 already created it. Apply 001 alone for a fresh install, or ensure 002 is only run when the enum/columns are not yet present.
2. **003**: For consistency, future migrations can use `public.`-qualified names (e.g. `public.sessions`). 003 is left as-is for already-applied environments.
3. **009**: Required for `app/api/players/[id]/route.ts` DELETE (moderator deletes unlinked name-slot player). Without it, that route returns 500 on delete.

---

## Verification

After applying migrations (including 009), you can confirm:

```sql
-- service_role has full users privileges
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'users' AND grantee = 'service_role';
-- Expect: SELECT, INSERT, UPDATE, DELETE
```
