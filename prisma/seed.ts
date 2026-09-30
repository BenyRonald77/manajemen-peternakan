import { PrismaClient } from "@prisma/client";
import { defaultStandar } from "../lib/ternak";

const prisma = new PrismaClient();

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

async function main() {
  const n = await prisma.kandang.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  const kandang1 = await prisma.kandang.create({
    data: {
      nama: "Kandang A1",
      tipe: "ayam_broiler",
      kapasitas: 2000,
      createdAt: new Date().toISOString(),
    },
  });
  await prisma.kandang.create({
    data: {
      nama: "Kolam B1",
      tipe: "lele",
      kapasitas: 5000,
      createdAt: new Date().toISOString(),
    },
  });

  // Siklus berjalan: ayam broiler, populasi 1000, sudah berjalan 14 hari
  const mulai = new Date();
  mulai.setDate(mulai.getDate() - 13);
  const standar = defaultStandar("ayam_broiler");
  const siklus = await prisma.siklus.create({
    data: {
      kandangId: kandang1.id,
      tanggalMulai: ymd(mulai),
      tanggalPanenRencana: (() => {
        const p = new Date(mulai);
        p.setDate(p.getDate() + standar.lama_siklus_hari);
        return ymd(p);
      })(),
      populasiAwal: 1000,
      status: "berjalan",
      standar: JSON.stringify(standar),
      createdAt: new Date().toISOString(),
    },
  });

  // 14 hari data contoh
  for (let i = 0; i < 14; i++) {
    const d = new Date(mulai);
    d.setDate(d.getDate() + i);
    const tgl = ymd(d);
    await prisma.pakanHarian.create({
      data: {
        siklusId: siklus.id,
        tanggal: tgl,
        jenisPakan: i < 7 ? "Starter" : "Grower",
        jumlahKg: 15 + i * 4,
      },
    });
    await prisma.bobotSampel.create({
      data: {
        siklusId: siklus.id,
        tanggal: tgl,
        jumlahSampel: 20,
        bobotRataGram: Math.round((40 + i * 58.5) * 10) / 10,
      },
    });
  }
  // mortalitas contoh (total 3 ekor = 0,3%)
  for (const [offset, jml, penyebab] of [
    [2, 1, "Heat stress"],
    [5, 1, "Sakit"],
    [9, 1, "Heat stress"],
  ] as const) {
    const d = new Date(mulai);
    d.setDate(d.getDate() + offset);
    await prisma.mortalitas.create({
      data: {
        siklusId: siklus.id,
        tanggal: ymd(d),
        jumlahEkor: jml,
        penyebab,
      },
    });
  }

  console.log("seed selesai: 2 kandang, 1 siklus berjalan + 14 hari data");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
