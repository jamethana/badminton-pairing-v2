-- Allow the service role to delete app users (name-slot players without LINE).
-- Used in app/api/players/[id]/route.ts when a moderator deletes an unlinked player.

GRANT DELETE ON public.users TO service_role;
