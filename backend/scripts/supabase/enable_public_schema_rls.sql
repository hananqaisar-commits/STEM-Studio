-- STEM Studio uses its FastAPI backend for all database access. The browser
-- does not access these tables through the Supabase Data API, so no anon or
-- authenticated policies are needed. Enabling RLS with no policies denies
-- direct Data API reads/writes while the backend's table-owner connection
-- continues to work.
--
-- Safe to run more than once. Missing tables are skipped so this also works
-- when a deployment has not created every optional table yet. Client-role
-- grants are revoked too; Supabase recommends managing grants as well as RLS.
DO $$
DECLARE
    table_name text;
    app_tables text[] := ARRAY[
        'users',
        'user_sessions',
        'owner_accounts',
        'owner_mfa_credentials',
        'owner_session_grants',
        'admin_audit_events',
        'email_verifications',
        'password_resets',
        'roles',
        'permissions',
        'user_roles',
        'role_permissions',
        'login_attempts',
        'quiz_attempts',
        'module_progress',
        'user_streaks',
        'saved_sessions',
        'tutor_learning_profiles',
        'reviews',
        'support_tickets',
        'user_preferences',
        'announcements',
        'announcement_recipients',
        'announcement_reads'
    ];
BEGIN
    FOREACH table_name IN ARRAY app_tables LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', table_name);
        END IF;
    END LOOP;

END
$$;

-- These tables are backend-only; clients should not be able to use table
-- identity sequences through the Supabase Data API either.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Verify the four critical tables shown in the Supabase Security Advisor.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('reviews', 'users', 'user_roles', 'roles')
ORDER BY c.relname;
