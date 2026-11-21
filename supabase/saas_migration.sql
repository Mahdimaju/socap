-- ============================================================================
-- LaperHemat SaaS Migration: Auth Trigger, Subscriptions Table & RLS
-- Jalankan skrip ini di Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Trigger otomatis: buat baris user_profiles setiap user baru mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabel Riwayat Langganan / Transaksi Midtrans
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  amount INT NOT NULL DEFAULT 19000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settlement', 'capture', 'expire', 'cancel', 'deny')),
  snap_token TEXT,
  payment_type TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order ON public.subscriptions(order_id);

-- 3. Privileges & RLS untuk user_profiles dan subscriptions
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own profile" ON public.user_profiles;
CREATE POLICY "Users insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users insert own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users update own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Izin tambah penjual & menu oleh pengguna yang sudah login (halaman /admin)
GRANT INSERT ON public.restaurants, public.menu_items TO authenticated;

DROP POLICY IF EXISTS "Authenticated insert restaurants" ON public.restaurants;
CREATE POLICY "Authenticated insert restaurants"
  ON public.restaurants FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated insert menu_items" ON public.menu_items;
CREATE POLICY "Authenticated insert menu_items"
  ON public.menu_items FOR INSERT
  TO authenticated
  WITH CHECK (true);
