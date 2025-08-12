-- Set secure search_path for trigger function to satisfy linter
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;