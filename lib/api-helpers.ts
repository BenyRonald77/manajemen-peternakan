import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidDate, isFutureDate, today } from "@/lib/format";
import {
  parseStandar,
  evaluasiPeringatan,
  hitungFCR,
  hitungMortalitasKumulatif,
  hitungADG,
  proyeksiPanen,
  type SampelBobot,
} from "@/lib/ternak";

export const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

/** Ambil siklus + pastikan berstatus berjalan. */
export async function requireSiklusBerjalan(id: number) {
  if (!Number.isInteger(id) || id <= 0) return { error: err("ID siklus tidak valid", 400) };
  const siklus = await prisma.siklus.findUnique({
    where: { id },
    include: { kandang: true },
  });
  if (!siklus) return { error: err("Siklus tidak ditemukan", 404) };
  if (siklus.status !== "berjalan")
    return { error: err("Siklus sudah selesai, pencatatan ditolak", 409) };
  return { siklus };
}

export function validasiTanggal(tanggal: unknown): string | null {
  if (typeof tanggal !== "string" || !isValidDate(tanggal))
    return "tanggal harus format YYYY-MM-DD yang valid";
  if (isFutureDate(tanggal)) return "tanggal tidak boleh di masa depan";
  return null;
}

/** Muat semua data siklus untuk evaluasi peringatan / analisis. */
export async function muatDataSiklus(siklusId: number) {
  const [siklus, pakan, mortalitas, bobot] = await Promise.all([
    prisma.siklus.findUnique({ where: { id: siklusId } }),
    prisma.pakanHarian.findMany({ where: { siklusId } }),
    prisma.mortalitas.findMany({ where: { siklusId } }),
    prisma.bobotSampel.findMany({ where: { siklusId }, orderBy: { tanggal: "asc" } }),
  ]);
  if (!siklus) return null;
  const standar = parseStandar(siklus.standar);
  const totalMati = mortalitas.reduce((a, m) => a + m.jumlahEkor, 0);
  const totalPakanKg = pakan.reduce((a, p) => a + p.jumlahKg, 0);
  const populasiSaatIni = siklus.populasiAwal - totalMati;
  const bobotTerakhir = bobot[bobot.length - 1] ?? null;
  const sampel: SampelBobot[] = bobot.map((b) => ({
    tanggal: b.tanggal,
    bobotRataGram: b.bobotRataGram,
  }));
  return {
    siklus,
    standar,
    totalMati,
    totalPakanKg,
    populasiSaatIni,
    mortalitasPersen: hitungMortalitasKumulatif(totalMati, siklus.populasiAwal),
    bobotTerakhirGram: bobotTerakhir?.bobotRataGram ?? null,
    tanggalBobotTerakhir: bobotTerakhir?.tanggal ?? null,
    fcr: hitungFCR(
      totalPakanKg,
      populasiSaatIni,
      bobotTerakhir?.bobotRataGram ?? null,
      siklus.populasiAwal
    ),
    adg: hitungADG(sampel),
    sampel,
    hariBerjalan:
      Math.floor(
        (new Date(today() + "T00:00:00").getTime() -
          new Date(siklus.tanggalMulai + "T00:00:00").getTime()) /
          86400000
      ) + 1,
  };
}

/**
 * Jalankan evaluasi peringatan untuk satu siklus dan simpan yang baru.
 * Dedup: tipe yang sama tidak disimpan ulang selama masih ada peringatan
 * belum terbaca dengan tipe tersebut.
 */
export async function evaluasiDanSimpanPeringatan(siklusId: number) {
  const data = await muatDataSiklus(siklusId);
  if (!data) return [];
  const baru = evaluasiPeringatan({
    totalMati: data.totalMati,
    populasiAwal: data.siklus.populasiAwal,
    totalPakanKg: data.totalPakanKg,
    populasiSaatIni: data.populasiSaatIni,
    bobotTerakhirGram: data.bobotTerakhirGram,
    sampelBobot: data.sampel,
    standar: data.standar,
  });
  const tersimpan: string[] = [];
  for (const p of baru) {
    const ada = await prisma.peringatan.findFirst({
      where: { siklusId, tipe: p.tipe, terbaca: false },
    });
    if (ada) continue;
    await prisma.peringatan.create({
      data: {
        siklusId,
        tanggal: today(),
        tipe: p.tipe,
        pesan: p.pesan,
        createdAt: new Date().toISOString(),
      },
    });
    tersimpan.push(p.tipe);
  }
  return tersimpan;
}

export { proyeksiPanen };
