-- ============================================================================
-- LaperHemat Database Schema & Seed Data (Supabase PostgreSQL)
-- Jalankan skrip ini sekali di Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Tabel Profil Pengguna (Terhubung ke auth.users Supabase)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  points INT DEFAULT 0,
  is_pro BOOLEAN DEFAULT FALSE,
  pro_expires_at TIMESTAMPTZ,
  daily_search_count INT DEFAULT 0,
  last_search_date DATE DEFAULT CURRENT_DATE,
  preferred_wallets TEXT[] DEFAULT ARRAY['GoPay', 'OVO', 'ShopeePay'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Restoran
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('GoFood', 'GrabFood', 'ShopeeFood')),
  category TEXT NOT NULL,
  city TEXT DEFAULT 'Banjarmasin',
  base_delivery_fee INT NOT NULL DEFAULT 12000,
  service_fee INT NOT NULL DEFAULT 4000,
  deep_link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Daftar Menu & Kalori
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price INT NOT NULL,
  calories INT NOT NULL,
  is_addon BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Promo Aktif
CREATE TABLE IF NOT EXISTS public.promos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('GoFood', 'GrabFood', 'ShopeeFood')),
  promo_code TEXT NOT NULL,
  title TEXT NOT NULL,
  min_spend INT NOT NULL,
  discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_discount INT NOT NULL,
  payment_method TEXT DEFAULT 'ALL',
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired')),
  submitted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indeks untuk Performa Query
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promos_platform_status ON public.promos(platform, status);

-- 6. Row Level Security (RLS) & Table Privileges (GRANT untuk role anon/authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.restaurants, public.menu_items, public.promos TO anon, authenticated;
GRANT INSERT ON public.promos TO anon, authenticated;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read restaurants" ON public.restaurants;
CREATE POLICY "Public read restaurants" ON public.restaurants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read menu_items" ON public.menu_items;
CREATE POLICY "Public read menu_items" ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active promos" ON public.promos;
CREATE POLICY "Public read active promos" ON public.promos FOR SELECT USING (status = 'active');

-- Kebijakan MVP agar pengguna tanpa login bisa menyetor promo komunitas
DROP POLICY IF EXISTS "Public insert community promos" ON public.promos;
CREATE POLICY "Public insert community promos" ON public.promos FOR INSERT WITH CHECK (status = 'active');

DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;
CREATE POLICY "Users read own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 7. Seed Data Banjarmasin (5 Restoran, 17 Menu & Add-on, 5 Promo Aktif)
-- ============================================================================
DO $$
DECLARE
  r_geprek UUID;
  r_burger UUID;
  r_mie UUID;
  r_martabak UUID;
  r_kopi UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.restaurants LIMIT 1) THEN
    INSERT INTO public.restaurants (name, platform, category, city, base_delivery_fee, service_fee, deep_link_url)
    VALUES ('Geprek Bensu A. Yani', 'GoFood', 'Ayam Geprek', 'Banjarmasin', 11000, 4000, 'https://gofood.co.id')
    RETURNING id INTO r_geprek;

    INSERT INTO public.restaurants (name, platform, category, city, base_delivery_fee, service_fee, deep_link_url)
    VALUES ('Burger Bangor Sultan Adam', 'ShopeeFood', 'Burger', 'Banjarmasin', 10000, 3500, 'https://shopee.co.id/m/shopeefood')
    RETURNING id INTO r_burger;

    INSERT INTO public.restaurants (name, platform, category, city, base_delivery_fee, service_fee, deep_link_url)
    VALUES ('Mie Gacoan Kayutangi', 'GrabFood', 'Mie', 'Banjarmasin', 12000, 4000, 'https://food.grab.com/id/id/')
    RETURNING id INTO r_mie;

    INSERT INTO public.restaurants (name, platform, category, city, base_delivery_fee, service_fee, deep_link_url)
    VALUES ('Martabak Pecenongan 78 Gatot', 'GoFood', 'Martabak', 'Banjarmasin', 12000, 4000, 'https://gofood.co.id')
    RETURNING id INTO r_martabak;

    INSERT INTO public.restaurants (name, platform, category, city, base_delivery_fee, service_fee, deep_link_url)
    VALUES ('Kopi Kenangan Duta Mall', 'ShopeeFood', 'Kopi', 'Banjarmasin', 9000, 3000, 'https://shopee.co.id/m/shopeefood')
    RETURNING id INTO r_kopi;

    -- Menu Utama & Add-on
    INSERT INTO public.menu_items (restaurant_id, name, price, calories, is_addon) VALUES
      (r_geprek, 'Paket Geprek Sambal Matah', 36000, 640, FALSE),
      (r_geprek, 'Paket Geprek Keju Leleh', 42000, 790, FALSE),
      (r_geprek, 'Es Teh Manis', 6000, 140, TRUE),
      (r_geprek, 'Kerupuk Udang', 4000, 110, TRUE),
      (r_geprek, 'Tahu Crispy (3 pcs)', 9000, 210, TRUE),

      (r_burger, 'Jelata Cheese Burger', 32000, 590, FALSE),
      (r_burger, 'Juragan Double Beef', 46000, 820, FALSE),
      (r_burger, 'Air Mineral 600ml', 5000, 0, TRUE),
      (r_burger, 'Kentang Goreng Reguler', 11000, 290, TRUE),

      (r_mie, 'Mie Hompimpa Level 2 + Udang Keju', 35000, 710, FALSE),
      (r_mie, 'Es Gobak Sodor', 9000, 180, TRUE),
      (r_mie, 'Pangsit Goreng (3 pcs)', 10000, 240, TRUE),

      (r_martabak, 'Martabak Tipker Coklat Keju', 38000, 760, FALSE),
      (r_martabak, 'Teh Pucuk Dingin', 6000, 120, TRUE),

      (r_kopi, 'Kopi Kenangan Mantan Large', 29000, 260, FALSE),
      (r_kopi, 'Roti Coklat Klasik', 12000, 280, TRUE),
      (r_kopi, 'Air Mineral Dingin', 6000, 0, TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promos LIMIT 1) THEN
    INSERT INTO public.promos (platform, promo_code, title, min_spend, discount_percent, max_discount, payment_method, expires_at, status) VALUES
      ('GoFood', 'GOFOODHEMAT50', 'Diskon GoFood 50% GoPay', 40000, 50, 25000, 'GoPay', NOW() + INTERVAL '30 days', 'active'),
      ('ShopeeFood', 'SHOPEE50BJM', 'Diskon ShopeeFood 50% Banjarmasin', 35000, 50, 22000, 'ShopeePay', NOW() + INTERVAL '30 days', 'active'),
      ('GrabFood', 'GRABUNTUNG45', 'Diskon GrabFood 45% OVO', 42000, 45, 24000, 'OVO', NOW() + INTERVAL '30 days', 'active'),
      ('GrabFood', 'QRISHEMAT35', 'Promo QRIS GrabFood 35%', 40000, 35, 18000, 'QRIS', NOW() + INTERVAL '30 days', 'active'),
      ('GoFood', 'GOFOODQRIS30', 'Promo GoFood QRIS 30%', 38000, 30, 16000, 'QRIS', NOW() + INTERVAL '30 days', 'active');
  END IF;
END $$;
