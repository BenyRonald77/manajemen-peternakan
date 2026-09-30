# Manajemen Peternakan

Aplikasi manajemen peternakan ayam (broiler/petelur) dan ikan (lele/nila)
berbasis siklus produksi: pencatatan pakan harian, mortalitas, dan bobot
sampel; perhitungan FCR, mortalitas kumulatif, ADG, dan proyeksi panen;
serta peringatan otomatis saat metrik menyimpang dari standar siklus.

Stack: Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## Halaman

- `/` — Dashboard: siklus berjalan + peringatan belum dibaca.
- `/kandang` — CRUD kandang.
- `/siklus` — Daftar siklus, mulai siklus baru, tutup siklus.
- `/siklus/[id]` — Metrik (populasi, mortalitas %, FCR, ADG, proyeksi panen),
  tren mingguan, form pencatatan harian, riwayat, dan peringatan siklus.

## API

| Method | Path | Deskripsi |
|---|---|---|
| GET/POST | /api/kandang | Daftar / tambah kandang |
| GET/PATCH/DELETE | /api/kandang/[id] | Detail / ubah / hapus |
| GET/POST | /api/siklus | Daftar / mulai siklus |
| GET/PATCH | /api/siklus/[id] | Detail / tutup siklus |
| GET | /api/siklus/[id]/analisis | Metrik + proyeksi panen |
| GET/POST | /api/siklus/[id]/pakan | Riwayat / catat pakan harian |
| GET/POST | /api/siklus/[id]/mortalitas | Riwayat / catat mortalitas |
| GET/POST | /api/siklus/[id]/bobot | Riwayat / catat bobot sampel |
| GET | /api/peringatan?terbaca=false | Daftar peringatan |
| PATCH | /api/peringatan/[id] | Tandai peringatan dibaca |

## Aturan bisnis penting

- Pencatatan harian hanya untuk siklus berstatus `berjalan` (409 jika sudah selesai).
- Tanggal tidak boleh di masa depan; semua jumlah harus > 0.
- Hanya 1 siklus berjalan per kandang (409 jika sudah ada).
- Peringatan otomatis terpicu setiap pencatatan: mortalitas kumulatif >
  ambang standar, FCR menyimpang > 10% dari target, ADG di bawah standar
  2 pencatatan berturut-turut.
