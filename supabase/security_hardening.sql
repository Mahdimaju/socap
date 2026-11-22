-- ============================================================================
-- LaperHemat Security Hardening (Strict RLS)
-- PENTING: Pastikan SUPABASE_SERVICE_ROLE_KEY (secret key asli dari Supabase)
-- sudah diisi di .env.local DAN Vercel Environment Variables sebelum
-- menjalankan skrip ini!
-- ============================================================================

-- 1. Cabut izin UPDATE langsung dari client pada user_profiles & subscriptions
--    agar user tidak bisa mengubah is_pro, points, daily_search_count, atau status bayar sendiri
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;

REVOKE INSERT, UPDATE ON public.user_profiles FROM authenticated;
REVOKE INSERT, UPDATE ON public.subscriptions FROM authenticated;

-- 2. Cabut izin INSERT langsung pada restaurants & menu_items dari role authenticated
--    agar hanya Next.js server (setelah memverifikasi ADMIN_EMAILS) yang bisa menambah penjual
DROP POLICY IF EXISTS "Authenticated insert restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated insert menu_items" ON public.menu_items;

REVOKE INSERT ON public.restaurants, public.menu_items FROM authenticated;
