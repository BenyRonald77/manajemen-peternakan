# PRD — Manajemen Peternakan

## 1. Ringkasan
Aplikasi manajemen peternakan ayam (broiler/petelur) dan ikan (lele/nila) berbasis
siklus produksi. Mencatat kandang, siklus pemeliharaan, konsumsi pakan harian,
mortalitas, dan bobot sampel secara harian; menghitung FCR, mortalitas kumulatif,
ADG (average daily gain), dan proyeksi panen; serta memicu peringatan otomatis
saat metrik menyimpang dari standar siklus.

## 2. Stack
- Next.js 14 + TypeScript, Prisma 5.22 + SQLite, Tailwind CSS
- Tanggal: TEXT `YYYY-MM-DD`; timestamp: TEXT ISO
- UI berbahasa Indonesia

## 3. Model Data

### Kandang
- id (Int, PK), nama (String), tipe (String: `ayam_broiler` | `ayam_petelur` |
  `lele` | `nila`), kapasitas (Int), createdAt (String ISO)

### Siklus
- id (Int, PK), kandangId (Int FK), tanggalMulai (String YYYY-MM-DD),
  tanggalPanenRencana (String YYYY-MM-DD, nullable),
  populasiAwal (Int), status (String: `berjalan` | `selesai`),
  standar (String JSON: `{ target_fcr, mortalitas_maks_persen,
  target_bobot_panen_gram, lama_siklus_hari }`), createdAt (String ISO)

### PakanHarian
- id, siklusId (FK), tanggal (YYYY-MM-DD), jenisPakan (String), jumlahKg (Float)

### Mortalitas
- id, siklusId (FK), tanggal (YYYY-MM-DD), jumlahEkor (Int), penyebab (String, nullable)

### BobotSampel
- id, siklusId (FK), tanggal (YYYY-MM-DD), jumlahSampel (Int), bobotRataGram (Float)

### Peringatan
- id, siklusId (FK), tanggal (YYYY-MM-DD), tipe (String), pesan (String),
  terbaca (Boolean, default false), createdAt (String ISO)

## 4. Fungsionalitas

### F0 — Setup: schema, seed, layout, dashboard
- Schema Prisma sesuai §3, seed: 2 kandang, 1 siklus berjalan (ayam broiler,
  populasi 1000) + 14 hari data pakan/mortalitas/bobot contoh.
- Dashboard (`/`): ringkasan kandang & siklus berjalan, kartu metrik per siklus
  (populasi saat ini, mortalitas %, FCR, ADG), daftar peringatan belum terbaca
  dengan tombol tandai terbaca.

### F1 — Master data: CRUD kandang, siklus
- `GET /api/kandang`, `POST /api/kandang`, `GET /api/kandang/[id]`,
  `PATCH /api/kandang/[id]`, `DELETE /api/kandang/[id]` (tolak jika punya siklus).
- `GET /api/siklus`, `POST /api/siklus` (mulai siklus baru: wajib kandangId,
  tanggalMulai, populasiAwal > 0; hanya 1 siklus `berjalan` per kandang —
  konflik → 409), `PATCH /api/siklus/[id]` (tutup siklus: status → `selesai`;
  hanya siklus berjalan).
- Halaman `/kandang` (CRUD) dan `/siklus` (daftar + mulai siklus + tutup siklus).

### F2 — Pencatatan harian
- `POST /api/siklus/[id]/pakan` { tanggal, jenisPakan, jumlahKg }
- `POST /api/siklus/[id]/mortalitas` { tanggal, jumlahEkor, penyebab? }
- `POST /api/siklus/[id]/bobot` { tanggal, jumlahSampel, bobotRataGram }
- Validasi (semua): siklus harus ada & berstatus `berjalan` (→ 404/409);
  tanggal tidak boleh masa depan (→ 400); jumlah > 0 (→ 400).
- Halaman `/siklus/[id]`: form pencatatan (3 form) + riwayat tabel per jenis.
- GET riwayat: `/api/siklus/[id]/pakan`, `/mortalitas`, `/bobot`.

### F3 — Perhitungan (`lib/ternak.ts`)
- `hitungFCR`: totalPakanKg / ((populasiAkhir × bobotRataKg) − biomassaAwalKg).
  Biomassa awal diasumsikan = populasiAwal × 40 gram (DOC broiler).
- `hitungMortalitasKumulatif`: totalMati / populasiAwal × 100 (%).
- `hitungADG`: dari 2 catatan bobot terakhir → (b2 − b1) gram / selisih hari.
- `proyeksiPanen`: dari bobot terakhir + ADG, estimasi tanggal saat bobot
  mencapai `target_bobot_panen_gram` standar + estimasi total bobot panen (kg).
- `GET /api/siklus/[id]/analisis`: populasiSaatIni, totalMati, mortalitasPersen,
  totalPakanKg, fcr, adgGramPerHari, bobotTerakhirGram, hariBerjalan,
  proyeksi { tanggalPanenEstimasi, estimasiBobotPanenKg, estimasiPopulasiPanen }.

### F4 — Peringatan otomatis
- Setiap pencatatan mortalitas/pakan/bobot memicu `evaluasiPeringatan`:
  1. Mortalitas kumulatif > `mortalitas_maks_persen` standar → peringatan
     `mortalitas_tinggi`.
  2. FCR berjalan menyimpang > 10% di atas `target_fcr` → peringatan
     `fcr_tinggi` (hanya jika ada data bobot & pakan).
  3. ADG di bawah standar 2 pencatatan berturut-turut → peringatan `adg_rendah`.
     Standar ADG turunan: `(target_bobot_panen_gram − 40) / lama_siklus_hari`.
  4. Dedup: peringatan tipe yang sama untuk siklus yang sama tidak disimpan
     ulang jika peringatan belum terbaca dengan tipe sama masih ada.
- Dashboard menampilkan daftar peringatan belum terbaca + tombol tandai terbaca
  (`PATCH /api/peringatan/[id]` { terbaca: true }).

### F5 — Dashboard per siklus
- Halaman `/siklus/[id]`: kartu metrik (populasi saat ini, mortalitas %,
  total pakan, FCR, ADG, proyeksi panen), tren bobot & pakan per minggu
  (bar chart CSS murni), riwayat peringatan siklus, form pencatatan harian (F2).

## 5. API Ringkas
| Method | Path | Deskripsi |
|---|---|---|
| GET/POST | /api/kandang | Daftar / tambah kandang |
| GET/PATCH/DELETE | /api/kandang/[id] | Detail / ubah / hapus |
| GET/POST | /api/siklus | Daftar / mulai siklus |
| GET/PATCH | /api/siklus/[id] | Detail / tutup siklus |
| GET | /api/siklus/[id]/analisis | Metrik + proyeksi |
| GET/POST | /api/siklus/[id]/pakan | Riwayat / catat pakan |
| GET/POST | /api/siklus/[id]/mortalitas | Riwayat / catat mortalitas |
| GET/POST | /api/siklus/[id]/bobot | Riwayat / catat bobot |
| GET | /api/peringatan?terbaca=false | Daftar peringatan |
| PATCH | /api/peringatan/[id] | Tandai terbaca |

## 6. Kriteria selesai
- `npm run build` lolos tanpa error TypeScript.
- Semua endpoint kunci teruji via curl: sukses + error (400/404/409).
- Repo baru `BenyRonald77/manajemen-peternakan`, push per fungsionalitas F0–F5.
