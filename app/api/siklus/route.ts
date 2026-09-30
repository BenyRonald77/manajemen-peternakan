import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, validasiTanggal } from "@/lib/api-helpers";
import { isValidDate } from "@/lib/format";
import { defaultStandar } from "@/lib/ternak";

export async function GET(req: NextRequest) {
  const status = new URL(req.url).searchParams.get("status");
  const rows = await prisma.siklus.findMany({
    where: status ? { status } : undefined,
    orderBy: { id: "desc" },
    include: { kandang: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const kandangId = Number(body?.kandangId);
  const tanggalMulai = body?.tanggalMulai;
  const populasiAwal = Number(body?.populasiAwal);
  const tanggalPanenRencana = body?.tanggalPanenRencana ?? null;

  const kandang = await prisma.kandang.findUnique({ where: { id: kandangId } });
  if (!kandang) return err("Kandang tidak ditemukan", 404);
  const tglErr = validasiTanggal(tanggalMulai);
  if (tglErr) return err(tglErr);
  if (!Number.isFinite(populasiAwal) || populasiAwal <= 0)
    return err("populasiAwal harus angka > 0");
  if (tanggalPanenRencana != null && tanggalPanenRencana !== "") {
    if (!isValidDate(tanggalPanenRencana)) return err("tanggalPanenRencana tidak valid");
    if (tanggalPanenRencana < tanggalMulai)
      return err("tanggalPanenRencana tidak boleh sebelum tanggalMulai");
  }
  const berjalan = await prisma.siklus.findFirst({
    where: { kandangId, status: "berjalan" },
  });
  if (berjalan)
    return err(
      `Kandang ${kandang.nama} sudah memiliki siklus berjalan (ID ${berjalan.id})`,
      409
    );

  const created = await prisma.siklus.create({
    data: {
      kandangId,
      tanggalMulai,
      tanggalPanenRencana:
        tanggalPanenRencana && tanggalPanenRencana !== "" ? tanggalPanenRencana : null,
      populasiAwal: Math.floor(populasiAwal),
      status: "berjalan",
      standar: JSON.stringify(defaultStandar(kandang.tipe)),
      createdAt: new Date().toISOString(),
    },
    include: { kandang: true },
  });
  return NextResponse.json(created, { status: 201 });
}
