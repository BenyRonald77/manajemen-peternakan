import { NextRequest, NextResponse } from "next/server";
import { muatDataSiklus, err, proyeksiPanen } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.siklus.findUnique({ where: { id } });
  if (!row) return err("Siklus tidak ditemukan", 404);
  const d = await muatDataSiklus(id);
  if (!d) return err("Siklus tidak ditemukan", 404);
  const proyeksi = proyeksiPanen(
    d.bobotTerakhirGram,
    d.tanggalBobotTerakhir,
    d.adg,
    d.standar,
    d.populasiSaatIni
  );
  return NextResponse.json({
    siklusId: id,
    status: d.siklus.status,
    populasiAwal: d.siklus.populasiAwal,
    populasiSaatIni: d.populasiSaatIni,
    totalMati: d.totalMati,
    mortalitasPersen: d.mortalitasPersen,
    totalPakanKg: d.totalPakanKg,
    bobotTerakhirGram: d.bobotTerakhirGram,
    fcr: d.fcr,
    adgGramPerHari: d.adg,
    hariBerjalan: d.hariBerjalan,
    standar: d.standar,
    proyeksi,
  });
}
