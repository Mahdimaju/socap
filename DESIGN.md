# Design System & UI/UX Specification (`DESIGN.md`)
## LaperHemat (*Project Gluttony — Mobile-First PWA*)

Dokumen ini menjadi panduan visual, struktur tata letak, *design tokens*, dan perilaku interaksi antarmuka untuk **LaperHemat**. Seluruh spesifikasi menggunakan utilitas **Tailwind CSS** dan ikon **Lucide React** agar dapat langsung diimplementasikan pada proyek Next.js.

---

## 1. Filosofi Desain & Arah Visual

* **Tema Utama:** *Appetizing Utility & Smart Indulgence* — menggabungkan warna hangat yang menggugah selera makan dengan kejelasan angka layaknya aplikasi finansial (*fintech*).
* **Mobile-First App Shell:** Antarmuka dirancang khusus untuk penggunaan satu tangan (*thumb-zone friendly*) pada layar ponsel (`360px`–`430px`). Saat dibuka di desktop, aplikasi ditampilkan di tengah layar dalam wadah (*container*) bergaya ponsel agar proporsi tetap presisi.
* **Hierarki Angka (*Number-First Hierarchy*):** Elemen paling mencolok pada setiap kartu hasil bukanlah nama restoran, melainkan **Harga Akhir Bersih**, **Nominal Hemat Ekstra**, dan **Trik Add-on**. Semua angka harga dan kalori wajib menggunakan `tabular-nums` agar sejajar rapi.

---

## 2. Design Tokens (Tailwind CSS)

### 2.1 Palet Warna

| Peran Warna | Nama Token | Hex | Kelas Tailwind | Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Craving & CTA)** | *Chili Orange* | `#EA580C` | `orange-600` (hover: `orange-700`) | Tombol aksi utama, indikator tab aktif, aksen selera makan |
| **Primary Soft** | *Warm Peach* | `#FFF7ED` | `orange-50` | Latar belakang chip aktif, highlight ringan |
| **Success (Cart-Hack)** | *Hemat Emerald* | `#059669` | `emerald-600` | Badge **"CART HACK AKTIF"**, teks nominal penghematan, indikator kalori aman |
| **Success Soft** | *Mint Surface* | `#ECFDF5` | `emerald-50` | Kotak rekomendasi *add-on* dengan garis putus-putus (`border-emerald-300`) |
| **Warning (Calorie Near)** | *Amber Alert* | `#D97706` | `amber-600` | Progress bar kalori saat mencapai $85\%$–$100\%$ dari batas harian |
| **Danger (Error/Over)** | *Rose Red* | `#E11D48` | `rose-600` | Pesan error OCR, indikator melebihi budget/kalori |
| **App Background** | *Soft Canvas* | `#F8FAFC` | `slate-50` | Latar belakang utama halaman |
| **Card Surface** | *Pure White* | `#FFFFFF` | `white` | Permukaan kartu form, kartu hasil, dan bottom sheet |
| **Text Primary** | *Deep Ink* | `#0F172A` | `slate-900` | Judul, harga akhir, label utama |
| **Text Secondary** | *Muted Slate* | `#64748B` | `slate-500` | Deskripsi, harga normal dicoret, metadata |
| **Border Default** | *Hairline* | `#E2E8F0` | `slate-200` | Garis pemisah kartu dan input |

### 2.2 Warna Identitas Platform (Badge)
* **GoFood:** Background `bg-green-100`, Teks `text-green-800`, Border `border-green-200`
* **GrabFood:** Background `bg-emerald-900`, Teks `text-white` (kontras tinggi agar jelas berbeda dari GoFood)
* **ShopeeFood:** Background `bg-orange-100`, Teks `text-orange-800`, Border `border-orange-200`

### 2.3 Tipografi
* **Font Family:** `Plus Jakarta Sans` (via `next/font/google`) — modern, geometris, dan sangat terbaca untuk angka nominal Rupiah.
* **Skala Tipografi:**
  * **Page Title:** `text-xl font-extrabold tracking-tight text-slate-900`
  * **Hero Price (Final):** `text-2xl font-black tracking-tight tabular-nums text-slate-900`
  * **Strikethrough Price:** `text-sm font-medium line-through tabular-nums text-slate-400`
  * **Section Heading:** `text-sm font-bold uppercase tracking-wider text-slate-500`
  * **Body & Labels:** `text-sm font-medium text-slate-700`
  * **Micro Caption / Badge:** `text-xs font-semibold`

### 2.4 Radius, Spacing & Elevasi
* **Card Radius:** `rounded-2xl` (`16px`) dengan `border border-slate-200/80 shadow-sm`
* **Button & Input Radius:** `rounded-xl` (`12px`)
* **Chip & Badge Radius:** `rounded-full`
* **Padding Halaman:** `px-4 pt-4 pb-24` (`pb-24` wajib agar konten terbawah tidak tertutup `BottomNav`)

---

## 3. Struktur Layout Shell (`src/app/layout.tsx`)

Aplikasi menggunakan pola **Centered Mobile Shell**:
* **Outer Viewport (Desktop):** `bg-slate-200 min-h-dvh flex justify-center`
* **App Container:** `w-full max-w-[430px] min-h-dvh bg-slate-50 relative flex flex-col shadow-2xl`
* **Sticky Top Header (`h-14`):**
  * Kiri: Logo teks **LaperHemat** (ikon `Flame` oranye) + pill lokasi kecil (`Banjarmasin`).
  * Kanan: Indikator sisa kuota harian (contoh: `2/2 Gratis` atau badge kuning emas `PRO` jika berlangganan/unlock 24 jam).
* **Fixed Bottom Navigation (`BottomNav.tsx`):**
  * Menempel di bawah (`fixed bottom-0 w-full max-w-[430px] bg-white/90 backdrop-blur-md border-t border-slate-200 h-16 z-40`).
  * 3 Tab sejajar:
    1. **Cari Hemat** (`/` — ikon `Flame`)
    2. **Mode Pesta** (`/split-order` — ikon `Users`)
    3. **Setor Promo** (`/submit-promo` — ikon `Camera`)
  * State aktif: teks & ikon `text-orange-600`, dengan titik indikator kecil di atas atau latar `bg-orange-50` di sekitar ikon.

---

## 4. Wireframe & Blueprint Layar Utama

### 4.1 Halaman Utama: Kalkulator Craving & Cart-Hacking (`/`)

```text
+------------------------------------------+
| [🔥 LaperHemat] [Banjarmasin]  [2/2 Free]|  <-- Sticky Header
+------------------------------------------+
|  Lagi pengen makan apa?                  |
|  [ Search: Ayam Geprek, Burger...     ]  |
|  (Ayam Geprek) (Burger) (Mie) (Kopi)     |  <-- Horizontal Scroll Chips
|                                          |
|  Budget Maksimal              Rp 45.000  |
|  |=========O--------------------------|  |  <-- Range Slider
|                                          |
|  Sisa Kalori: 900 kkal   [o] Mode Bebas  |  <-- Slider + Toggle
|  |===============O--------------------|  |
|                                          |
|  Dompet Digital Aktif:                   |
|  [✓ GoPay] [✓ ShopeePay] [ OVO] [ QRIS]  |  <-- Multi-select Pills
|                                          |
|  +------------------------------------+  |
|  |     ⚡ Cari Kombinasi Termurah     |  |  <-- Primary CTA (orange-600)
|  +------------------------------------+  |
+------------------------------------------+
|  HASIL TERHEMAT (3 Ditemukan)            |
|                                          |
|  +------------------------------------+  |
|  | [GoFood]  Geprek Bensu A. Yani     |  |
|  |                                    |  |
|  | Paket Geprek Sambal Matah          |  |
|  |                                    |  |
|  | +- - - - - - - - - - - - - - - -+  |  |  <-- Emerald Dashed Box
|  | | ⚡ CART HACK AKTIF             |  |  |
|  | | + Tambah Es Teh Manis (Rp6rb) |  |  |
|  | | Biar voucher 50% aktif!       |  |  |
|  | | Hemat ekstra Rp19.000         |  |  |
|  | +- - - - - - - - - - - - - - - -+  |  |
|  |                                    |  |
|  | Rp 26.000   Rp 45.000 (dicoret)    |  |  <-- Hero Price
|  | [██████████░░░] 780 / 900 kkal     |  |  <-- Calorie Bar
|  |                                    |  |
|  | v Lihat rincian harga & ongkir     |  |  <-- Accordion
|  | +--------------------------------+ |  |
|  | |  📋 Salin Promo & Buka GoFood  | |  |  <-- Card CTA
|  | +--------------------------------+ |  |
|  +------------------------------------+  |
+------------------------------------------+
|  [🔥 Cari]     [👥 Pesta]    [📷 Setor]  |  <-- Fixed BottomNav
+------------------------------------------+
```

### 4.2 Halaman Mode Pesta: Split-Order Optimizer (`/split-order`)

```text
+------------------------------------------+
|  Mode Pesta (Pecah Transaksi)            |
|  Cari tahu lebih murah 1x bayar atau     |
|  dipecah jadi beberapa pesanan.          |
|                                          |
|  +------------------------------------+  |
|  | Total Harga Makanan  [ Rp 150.000 ]|  |
|  | Ongkir+Layanan/Order [ Rp  16.000 ]|  |
|  | Min. Belanja Voucher [ Rp  50.000 ]|  |
|  | Diskon (%) [ 50 ]  Max [Rp 25.000 ]|  |
|  | [ Hitung Strategi Termurah ]       |  |
|  +------------------------------------+  |
|                                          |
|  +====================================+  |
|  | 🏆 REKOMENDASI: PECAH 3 TRANSAKSI  |  |  <-- Highlight Card (emerald)
|  | Total Bayar: Rp 123.000            |  |
|  | Hemat Rp 18.000 vs pesan sekaligus |  |
|  +====================================+  |
|                                          |
|  Perbandingan Skenario:                  |
|  • 1 Transaksi : Rp 141.000 (1x diskon)  |
|  • 2 Transaksi : Rp 132.000 (2x diskon)  |
|  • 3 Transaksi : Rp 123.000 (3x diskon)✓ |
+------------------------------------------+
```

### 4.3 Halaman Setor Promo: AI OCR Uploader (`/submit-promo`)

```text
+------------------------------------------+
|  Setor Promo, Dapat Akses Unlimited!     |
|  Upload screenshot voucher untuk buka    |
|  pencarian tanpa batas selama 24 jam.    |
|                                          |
|  +- - - - - - - - - - - - - - - - - - +  |
|  |              [ 📷 ]                |  |  <-- Dashed Dropzone
|  |   Tap untuk pilih screenshot       |  |
|  |   voucher GoFood/Grab/Shopee       |  |
|  |   (Maks 4MB • Privasi aman)        |  |
|  +- - - - - - - - - - - - - - - - - - +  |
|                                          |
|  [Saat gambar diproses -> AI Scanning]   |
|  +------------------------------------+  |
|  | ✨ Hasil Baca AI (Cek & Konfirmasi)|  |
|  | Platform    : [ ShopeeFood v ]     |  |
|  | Kode Promo  : [ SHOPEEHEMAT50 ]    |  |
|  | Min Belanja : [ 50000 ]            |  |
|  | Diskon      : [ 50% ] Max [ 25000 ]|  |
|  | [ ✓ Konfirmasi & Klaim 24 Jam Pro ]|  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

## 5. Spesifikasi Detail Komponen UI

### 5.1 `ResultCard.tsx` (Komponen Paling Kritis)
1. **Header Kartu:** Badge platform di kiri + nama restoran (`truncate`) di sampingnya.
2. **Blok Cart-Hack (Kondisional jika `isCartHacked === true`):**
   * Wadah `bg-emerald-50 border border-dashed border-emerald-400 rounded-xl p-3`.
   * Judul kecil `text-xs font-extrabold text-emerald-700 flex items-center gap-1` dengan ikon `Sparkles` atau `Zap`.
   * Penjelasan singkat dalam bahasa sehari-hari: *"Tambah **[Nama Add-on]** (Rp[Harga]) agar diskon terpicu → **Hemat ekstra Rp[Selisih]**"*.
3. **Blok Harga:**
   * Harga final besar di kiri (`Rp 26.000`), harga normal dicoret di sampingnya (`Rp 45.000`).
4. **Calorie Guardrail Bar:**
   * Hanya tampil jika pengguna tidak mengaktifkan *Mode Bebas Kalori*.
   * Bar tipis `h-2 rounded-full bg-slate-100` dengan isian `bg-emerald-500` (jika $< 85\%$ batas) atau `bg-amber-500` (jika $85\%$–$100\%$).
5. **Accordion Rincian Harga:**
   * Default tertutup agar kartu tetap ringkas. Saat diklik, menampilkan tabel 2 kolom: Menu Utama, Add-on, Ongkir + Layanan, Potongan Voucher (`text-emerald-600`), dan Total Akhir.
6. **Tombol Eksekusi:**
   * Lebar penuh (`w-full py-3 rounded-xl font-bold`), warna `bg-slate-900 text-white hover:bg-slate-800` (agar tidak bertabrakan dengan warna oranye tombol pencarian di atas).

### 5.2 `QuotaPaywallModal.tsx` (Bottom Sheet)
* Muncul dari bawah layar (`rounded-t-3xl bg-white p-6`) dengan *backdrop* `bg-slate-900/50 backdrop-blur-xs`.
* Judul: *"Kuota Gratis Hari Ini Habis!"*
* Dua tombol pilihan berurutan:
  1. **Pilihan Utama (Gratis — `bg-emerald-600 text-white`):** *"Setor 1 Screenshot Promo → Buka 24 Jam Gratis"* (mengarahkan ke `/submit-promo`).
  2. **Pilihan Sekunder (`border border-slate-300 text-slate-800`):** *"Langganan Pro — Rp19.000/bulan"*.

---

## 6. Micro-Interactions, Loading & Edge States

| State | Perilaku UI & Copywriting |
| :--- | :--- |
| **Loading Pencarian** | Tampilkan 2 *skeleton card* (`animate-pulse`) + teks dinamis: *"Menghitung ongkir & celah voucher..."*. |
| **Loading AI OCR** | Tampilkan pratinjau gambar dengan overlay gradien bergerak (*scanning line*) dan teks: *"AI sedang membaca syarat & ketentuan voucher..."*. |
| **Toast Copy Kode** | Muncul di atas `BottomNav` (`bottom-20`), latar `bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg`, hilang otomatis dalam 2,5 detik. |
| **Empty State (Budget Terlalu Rendah)** | Ikon mangkuk kosong + pesan ramah: *"Belum ada kombinasi di bawah Rp[Budget]. Ini opsi paling mendekati (+Rp[Selisih]):"* diikuti 1 kartu rekomendasi terdekat. |
| **Error OCR (Gambar Buram)** | Banner merah lembut (`bg-rose-50 text-rose-700`) berisi pesan error + langsung membuka form input manual kosong agar pengguna tetap bisa menyetor promo tanpa frustrasi. |

---

## 7. Standar Ergonomi Mobile & Aksesibilitas

* **Minimum Touch Target:** Semua tombol, chip filter, dan tab navigasi memiliki tinggi minimal `44px` (`min-h-[44px]`) agar mudah ditekan ibu jari tanpa salah pencet.
* **Kontras Teks:** Seluruh teks utama dan angka harga memenuhi rasio kontras minimal WCAG AA ($4.5:1$).
* **Safe Area iOS/Android:** Gunakan `pb-[env(safe-area-inset-bottom)]` pada `BottomNav` agar tidak bertabrakan dengan garis navigasi gestur (*home indicator*) pada ponsel modern.