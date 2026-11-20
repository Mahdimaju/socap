# Product Requirements Document (PRD) — All-in-One Technical & Product Spec
## LaperHemat (*Project Gluttony: Promo-Stacking & Craving Maximizer*)

| Atribut | Detail |
| :--- | :--- |
| **Nama Produk** | LaperHemat |
| **Versi Dokumen** | v2.0 — Complete Engineering-Ready MVP Spec |
| **Platform** | Progressive Web App (PWA) — Mobile-First Web |
| **Tech Stack** | Next.js (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), Gemini 2.5 Flash API |
| **Target Deployment** | Vercel |

---

## 1. Visi Produk & Ringkasan Eksekutif

### 1.1 Latar Belakang Masalah
Pengguna aplikasi pesan-antar makanan (GoFood, GrabFood, ShopeeFood) sering membuang waktu membandingkan harga akhir (*true-checkout price*) antar aplikasi akibat komponen biaya tersembunyi (ongkir, biaya layanan, biaya pengemasan) serta syarat minimal belanja voucher yang rumit. Sementara itu, aplikasi diet konvensional memiliki tingkat retensi rendah karena berfokus pada pembatasan makan (*restriction*).

### 1.2 Solusi (*Core Value Proposition*)
**LaperHemat** membalik pendekatan tersebut dengan memaksimalkan kepuasan makan (*guilt-free indulgence*):
1. **True-Checkout Comparison:** Membandingkan harga bersih akhir setelah seluruh biaya tambahan dan diskon, bukan sekadar harga katalog.
2. **Cart-Hacking Engine:** Secara otomatis mencari menu pendamping (*add-on*) termurah yang membuat total belanja menembus syarat minimal voucher, sehingga **pengguna mendapat porsi lebih banyak dengan harga bayar akhir lebih murah**.
3. **Calorie Guardrail:** Memastikan total kombinasi menu utama + *add-on* tetap berada di bawah sisa batas kalori harian pengguna.
4. **Crowdsourced AI Promo Engine:** Mengatasi ketiadaan API publik dari platform pesan-antar melalui sistem setor *screenshot* voucher berbasis komunitas yang diekstrak otomatis oleh AI Multimodal (OCR).

---

## 2. Target Pengguna (*User Personas*)

1. **Pemburu Diskon Harian (Mahasiswa/Anak Kos):** Memesan makanan 1–2x sehari, sangat sensitif terhadap selisih Rp5.000–Rp15.000, bersedia menambahkan menu pendamping demi memicu voucher diskon besar.
2. **Pekerja Kantoran Sadar Kalori:** Ingin makan enak saat jam makan siang tanpa melebihi batas kalori harian (misal: sisa 800–1.000 kkal) dan tanpa pusing menghitung promo.
3. **Koordinator Pesan Bareng (*Group Orderer*):** Membutuhkan kalkulator cepat untuk menentukan apakah pesanan kelompok lebih hemat digabung dalam 1 transaksi atau dipecah menjadi 2–3 transaksi terpisah.

---

## 3. Arsitektur Teknis & Struktur Direktori

### 3.1 Tech Stack
* **Framework:** Next.js 15+ (App Router, TypeScript, Turbopack)
* **Styling & UI:** Tailwind CSS + `lucide-react` (Mobile-First, lebar optimal 360px–430px, terpusat di layar desktop)
* **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Google OAuth / Magic Link)
* **AI OCR Engine:** Google Gemini 2.5 Flash (`@google/genai`) untuk ekstraksi gambar *screenshot* voucher ke JSON terstruktur
* **PWA:** `manifest.json` + ikon aplikasi agar dapat di-*install* ke *home screen*

### 3.2 Struktur Folder Proyek
```text
laper-hemat/
├── public/
│   ├── manifest.json
│   ├── icon-192x192.png
│   └── icon-512x512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (Mobile shell + Bottom Nav)
│   │   ├── page.tsx                # Halaman utama: Kalkulator Craving & Cart-Hacking
│   │   ├── split-order/
│   │   │   └── page.tsx            # Halaman Mode Pesta (Split-Order Optimizer)
│   │   ├── submit-promo/
│   │   │   └── page.tsx            # Halaman Setor Promo (Upload Screenshot AI OCR)
│   │   └── api/
│   │       ├── optimize/route.ts   # Endpoint kalkulasi Cart-Hacking
│   │       ├── ocr-promo/route.ts  # Endpoint ekstraksi gambar voucher via Gemini
│   │       └── promos/route.ts     # CRUD promo & validasi
│   ├── components/
│   │   ├── CravingForm.tsx         # Form input makanan, budget, kalori, dompet digital
│   │   ├── ResultCard.tsx          # Kartu hasil perbandingan + badge "Hemat Ekstra"
│   │   ├── SplitOrderCalc.tsx      # Kalkulator pecah transaksi
│   │   ├── PromoUploader.tsx       # Drag/drop & preview screenshot voucher
│   │   └── BottomNav.tsx           # Navigasi bawah ala aplikasi mobile
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client helper
│   │   ├── cartHacking.ts          # Algoritma inti optimizeCart & optimizeSplitOrder
│   │   └── types.ts                # Definisi interface TypeScript global
└── .env.local
```

### 3.3 Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## 4. Skema Database Lengkap (Supabase PostgreSQL)

Jalankan skrip SQL berikut di Supabase SQL Editor untuk membangun seluruh tabel, relasi, dan *Row Level Security* (RLS):

```sql
-- 1. Tabel Profil Pengguna (Terhubung ke auth.users Supabase)
CREATE TABLE public.user_profiles (
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
CREATE TABLE public.restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('GoFood', 'GrabFood', 'ShopeeFood')),
  category TEXT NOT NULL, -- misal: 'Ayam', 'Burger', 'Kopi', 'Nasi'
  city TEXT DEFAULT 'Banjarmasin',
  base_delivery_fee INT NOT NULL DEFAULT 12000,
  service_fee INT NOT NULL DEFAULT 4000,
  deep_link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Daftar Menu & Kalori
CREATE TABLE public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price INT NOT NULL,
  calories INT NOT NULL,
  is_addon BOOLEAN DEFAULT FALSE, -- TRUE untuk nasi, es teh, kentang, sambal
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Promo Aktif
CREATE TABLE public.promos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('GoFood', 'GrabFood', 'ShopeeFood')),
  promo_code TEXT NOT NULL,
  title TEXT NOT NULL,
  min_spend INT NOT NULL,
  discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_discount INT NOT NULL,
  payment_method TEXT DEFAULT 'ALL', -- 'GoPay', 'OVO', 'ShopeePay', 'QRIS', 'ALL'
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired')),
  submitted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indeks untuk Performa Query
CREATE INDEX idx_restaurants_category ON public.restaurants(category);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX idx_promos_platform_status ON public.promos(platform, status);

-- 6. Row Level Security (RLS) Dasar
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Public read active promos" ON public.promos FOR SELECT USING (status = 'active');
CREATE POLICY "Users read own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
```

---

## 5. Spesifikasi Fitur Detail & Kriteria Penerimaan

### F-01: Quick Craving & Wallet Setup (Tanpa Wajib Login)
* **Deskripsi:** Layar utama langsung menampilkan form pencarian cepat.
* **Input Pengguna:**
  * Kata kunci / Kategori *Craving* (Chips cepat: Ayam Geprek, Burger, Mie, Martabak, Kopi, atau input teks bebas).
  * Slider **Budget Maksimal** (Rp15.000 – Rp150.000, kelipatan Rp5.000).
  * Slider **Sisa Batas Kalori** (300 kkal – 2.000 kkal, opsi toggle *"Abaikan Kalori / Mode Bebas"*).
  * Checkbox **Dompet Digital Aktif** (`GoPay`, `OVO`, `ShopeePay`, `Tunai/QRIS`).
* **Acceptance Criteria:** Pengguna dapat menjalankan simulasi pertama tanpa registrasi (menggunakan *localStorage* untuk melacak kuota 2x pencarian gratis harian).

### F-02: True-Checkout & Cart-Hacking Engine (Fitur Inti)
* **Deskripsi:** Sistem mencari restoran & menu utama yang cocok, memasangkannya dengan promo aktif di platform terkait, lalu menghitung apakah penambahan 1 *add-on* menghasilkan harga akhir lebih murah.
* **Tampilan Kartu Hasil (`ResultCard`):**
  * Nama Restoran, Badge Platform (warna khas: Hijau GoFood, Hijau Tua GrabFood, Oranye ShopeeFood).
  * **Harga Akhir Bersih** (teks besar & tebal) vs **Harga Normal Tanpa Trik** (teks dicoret).
  * **Badge "CART HACK AKTIF"** jika sistem menyarankan penambahan *add-on* (contoh: *"+ Tambah Es Teh Manis (Rp6.000) agar diskon Rp25.000 aktif → Hemat ekstra Rp19.000!"*).
  * Indikator **Total Kalori** (progress bar hijau jika $\le$ batas kalori pengguna).
  * Rincian *expandable*: Harga Menu + Harga Add-on + Ongkir + Biaya Layanan - Potongan Voucher = Total Bayar.

### F-03: Setor Promo Komunitas (AI OCR via Gemini Flash)
* **Deskripsi:** Pengguna dapat mengunggah *screenshot* halaman voucher dari Gojek/Grab/Shopee untuk diekstrak otomatis.
* **Alur Kerja:**
  1. Pengguna memilih file gambar (maksimal 4MB, format JPG/PNG/WebP).
  2. Frontend mengirim gambar ke `POST /api/ocr-promo`.
  3. Server memproses gambar menggunakan Gemini 2.5 Flash dan mengembalikan hasil ekstraksi terstruktur ke layar pengguna untuk konfirmasi 1 klik.
  4. Gambar **tidak disimpan permanen** di server demi privasi.
  5. Setelah dikonfirmasi, data masuk ke tabel `promos`, dan pengguna mendapat **+10 Poin** serta **Akses Tanpa Batas 24 Jam**.

### F-04: Eksekusi Pesanan (*Copy Code & Deep-Link*)
* **Deskripsi:** Tombol CTA utama pada setiap kartu hasil bertuliskan *"Salin Promo & Buka [Platform]"*.
* **Acceptance Criteria:** Saat diklik, kode promo otomatis disalin ke *clipboard*, muncul *toast notification* `"Kode promo [KODE] berhasil disalin!"`, dan browser membuka `deep_link_url` restoran di tab baru.

### F-05: Mode Pesta (*Split-Order Optimizer*)
* **Deskripsi:** Kalkulator khusus pesanan kelompok (halaman `/split-order`).
* **Input:** Total nilai belanja makanan ($T$), jumlah orang ($N$), ongkir + biaya layanan per transaksi ($F$), minimal belanja voucher ($M$), persentase diskon ($P$), dan maksimal diskon per transaksi ($D_{\max}$).
* **Output:** Rekomendasi jumlah pecahan transaksi ($k \in \{1, 2, 3, 4\}$) yang menghasilkan total bayar paling rendah, lengkap dengan selisih penghematan dibandingkan memesan sekaligus.

### F-06: Batas Kuota Gratis & Monetisasi Mikro
* **Pengguna Gratis:** Maksimal 2x pencarian kalkulator per hari.
* **Unlock Akses:** Jika kuota habis, tampilkan modal dengan dua pilihan:
  1. **Gratis:** Setor 1 *screenshot* voucher aktif (membuka akses tak terbatas 24 jam).
  2. **Berbayar (Pro):** Langganan Rp19.000/bulan (placeholder tombol integrasi payment gateway Midtrans/Xendit untuk fase pasca-MVP).

---

## 6. Spesifikasi Algoritma Inti (`src/lib/cartHacking.ts`)

### 6.1 Rumus Matematika *True-Checkout*
Untuk setiap kombinasi menu utama ($p_{\text{main}}$) dan opsional *add-on* ($p_{\text{addon}}$), dengan total biaya tambahan $F = \text{ongkir} + \text{biaya layanan}$:

$$S = p_{\text{main}} + p_{\text{addon}}$$

Jika $S \ge M_{\text{spend}}$, maka potongan diskon aktual adalah:

$$D = \min\left(S \times \frac{P_{\text{disc}}}{100},\; D_{\max}\right)$$

Harga akhir (*True-Checkout Price*) adalah:

$$C_{\text{final}} = S + F - D$$

### 6.2 Implementasi Logika *Cart-Hacking* (TypeScript)
```typescript
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  calories: number;
  is_addon: boolean;
}

export interface Promo {
  id: string;
  platform: 'GoFood' | 'GrabFood' | 'ShopeeFood';
  promo_code: string;
  min_spend: number;
  discount_percent: number;
  max_discount: number;
  payment_method: string;
}

export interface OptimizationResult {
  mainDish: MenuItem;
  addedAddon: MenuItem | null;
  appliedPromo: Promo | null;
  normalPriceWithoutHack: number;
  finalPrice: number;
  totalCalories: number;
  extraSavings: number;
  isCartHacked: boolean;
}

export function optimizeCart(
  mainDish: MenuItem,
  addons: MenuItem[],
  promos: Promo[],
  extraFees: number,
  maxCalories: number | null
): OptimizationResult {
  // Baseline: Beli menu utama saja dengan promo terbaik yang langsung memenuhi syarat
  let bestResult: OptimizationResult = {
    mainDish,
    addedAddon: null,
    appliedPromo: null,
    normalPriceWithoutHack: mainDish.price + extraFees,
    finalPrice: mainDish.price + extraFees,
    totalCalories: mainDish.calories,
    extraSavings: 0,
    isCartHacked: false,
  };

  // Cek baseline jika menu utama saja sudah memenuhi promo
  for (const promo of promos) {
    if (mainDish.price >= promo.min_spend) {
      const disc = Math.min((mainDish.price * promo.discount_percent) / 100, promo.max_discount);
      const price = mainDish.price + extraFees - disc;
      if (price < bestResult.finalPrice) {
        bestResult.finalPrice = price;
        bestResult.normalPriceWithoutHack = price;
        bestResult.appliedPromo = promo;
      }
    }
  }

  const baselinePrice = bestResult.finalPrice;

  // Uji kombinasi dengan setiap add-on untuk mencari Cart-Hack terbaik
  for (const addon of addons) {
    const totalCalories = mainDish.calories + addon.calories;
    if (maxCalories !== null && totalCalories > maxCalories) continue;

    const combinedFoodPrice = mainDish.price + addon.price;

    for (const promo of promos) {
      if (combinedFoodPrice >= promo.min_spend) {
        const rawDiscount = (combinedFoodPrice * promo.discount_percent) / 100;
        const actualDiscount = Math.min(rawDiscount, promo.max_discount);
        const finalPrice = combinedFoodPrice + extraFees - actualDiscount;

        // Cart-hack dianggap berhasil jika harga akhir lebih murah daripada beli menu utama saja
        if (finalPrice < bestResult.finalPrice) {
          bestResult = {
            mainDish,
            addedAddon: addon,
            appliedPromo: promo,
            normalPriceWithoutHack: baselinePrice,
            finalPrice,
            totalCalories,
            extraSavings: baselinePrice - finalPrice,
            isCartHacked: true,
          };
        }
      }
    }
  }

  return bestResult;
}
```

---

## 7. Spesifikasi API & System Prompt AI OCR

### 7.1 `POST /api/optimize`
* **Request Body:**
  ```json
  {
    "craving": "Ayam Geprek",
    "maxBudget": 45000,
    "maxCalories": 900,
    "wallets": ["GoPay", "ShopeePay"]
  }
  ```
* **Response (200 OK):** Array objek `OptimizationResult` yang telah diurutkan dari `finalPrice` termurah, maksimal 10 hasil teratas yang memenuhi `finalPrice <= maxBudget`.

### 7.2 `POST /api/ocr-promo` (Gemini 2.5 Flash)
* **Request Body:** `multipart/form-data` berisi field `image`.
* **System Prompt untuk Gemini API:**
  ```text
  Anda adalah sistem ekstraksi data voucher pesan-antar makanan Indonesia (GoFood, GrabFood, ShopeeFood).
  Analisis gambar screenshot voucher yang diberikan dan kembalikan HANYA objek JSON valid tanpa markdown fence dengan struktur berikut:
  {
    "platform": "GoFood" | "GrabFood" | "ShopeeFood",
    "promo_code": "string (jika tidak ada kode, tulis AUTO)",
    "title": "string ringkas nama promo",
    "min_spend": number (dalam Rupiah, integer tanpa titik),
    "discount_percent": number (integer 1-100),
    "max_discount": number (dalam Rupiah, integer tanpa titik),
    "payment_method": "GoPay" | "OVO" | "ShopeePay" | "QRIS" | "ALL",
    "expires_at": "ISO-8601 date string (jika tidak tertera, set 7 hari dari hari ini)"
  }
  Jika gambar bukan merupakan voucher makanan yang valid, kembalikan {"error": "Bukan gambar voucher yang valid"}.
  ```

---

## 8. Panduan UI/UX & Design System

* **Gaya Visual:** *Vibrant, Appetizing, & High-Contrast* (membangkitkan selera sekaligus menonjolkan angka penghematan).
* **Palet Warna:**
  * Primary Action: Oranye Kemerahan (`#EA580C` / Tailwind `orange-600`) — pemicu psikologis nafsu makan & urgensi promo.
  * Savings / Cart-Hack Badge: Hijau Zamrud (`#059669` / Tailwind `emerald-600`) — sinyal keuntungan finansial.
  * Background: Abu-abu sangat muda (`#F8FAFC` / Tailwind `slate-50`) dengan kartu putih bersih (`#FFFFFF`) dan bayangan halus.
* **Navigasi Bawah (`BottomNav`):** 3 tab tetap di bagian bawah layar:
  1. **Cari Hemat** (`/`) — Ikon `Flame`
  2. **Mode Pesta** (`/split-order`) — Ikon `Users`
  3. **Setor Promo** (`/submit-promo`) — Ikon `Camera`

---

## 9. Persyaratan Non-Fungsional & Edge Cases

### 9.1 Non-Functional Requirements
* **Performa:** Waktu respons `/api/optimize` $< 300\text{ ms}$; *First Contentful Paint* $< 1.5\text{ detik}$.
* **Privasi:** Gambar unggahan OCR diproses langsung di memori (Buffer/Base64) dan dikirim ke Gemini API tanpa disimpan ke disk/storage bucket.
* **PWA:** Wajib memiliki `public/manifest.json` dengan `display: "standalone"` agar nyaman dipakai di ponsel.

### 9.2 Edge Cases yang Wajib Ditangani
1. **Tidak ada hasil dalam budget:** Tampilkan pesan ramah beserta 1 rekomendasi terdekat yang selisihnya paling kecil dari budget pengguna.
2. **Gambar OCR buram/tidak valid:** Tampilkan pesan error yang jelas dan sediakan form input manual sebagai *fallback*.
3. **Promo kedaluwarsa:** Query database selalu menyertakan filter `expires_at > NOW()`.
4. **Add-on melebihi batas kalori:** Algoritma wajib melewati *add-on* tersebut meskipun membuat harga lebih murah, kecuali pengguna menyalakan opsi *"Mode Bebas Kalori"*.

---

## 10. Checklist Implementasi (Urutan Eksekusi)

1. [ ] Inisialisasi proyek Next.js + Tailwind CSS + install `@supabase/supabase-js`, `@google/genai`, `lucide-react`.
2. [ ] Jalankan skrip SQL di Supabase dan masukkan minimal 5 restoran sampel, 20 menu (termasuk *add-on* murah), serta 5 promo aktif untuk *seeding*.
3. [ ] Buat `src/lib/supabase.ts`, `src/lib/types.ts`, dan `src/lib/cartHacking.ts`.
4. [ ] Bangun API Routes: `/api/optimize` dan `/api/ocr-promo`.
5. [ ] Bangun UI komponen mobile-first (`BottomNav`, `CravingForm`, `ResultCard`, `SplitOrderCalc`, `PromoUploader`).
6. [ ] Hubungkan seluruh halaman (`/`, `/split-order`, `/submit-promo`) dan tambahkan `manifest.json` untuk PWA.
7. [ ] Uji seluruh *edge cases* di tampilan mobile (*Chrome DevTools Mobile View*) dan deploy ke Vercel.