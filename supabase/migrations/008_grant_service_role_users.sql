-- Allow the service role (auth callback) to upsert into public.users.
-- The callback uses the admin client (SUPABASE_SERVICE_ROLE_KEY) to create/update
-- app users after LINE OAuth; without INSERT/UPDATE the callback returns user_upsert_failed.

GRANT SELECT, INSERT, UPDATE ON public.users TO service_role;
