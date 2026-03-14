-- Grant table-level access so the authenticated role can use public.users.
-- RLS policies (004/005) still restrict which rows are visible/editable.
-- Without these grants, client queries get "permission denied for table users".

GRANT SELECT, UPDATE ON public.users TO authenticated;
