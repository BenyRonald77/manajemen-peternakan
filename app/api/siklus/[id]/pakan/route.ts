import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, requireSiklusBerjalan, validasiTanggal, evaluasiDanSimpanPeringatan } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const rows = await prisma.pakanHarian.findMany({
    where: { siklusId: id },
    orderBy: { tanggal: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { siklus, error } = await requireSiklusBerjalan(id);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const tglErr = validasiTanggal(body?.tanggal);
  if (tglErr) return err(tglErr);
  const jenisPakan = typeof body?.jenisPakan === "string" ? body.jenisPakan.trim() : "";
  if (!jenisPakan) return err("jenisPakan wajib diisi");
  const jumlahKg = Number(body?.jumlahKg);
  if (!Number.isFinite(jumlahKg) || jumlahKg <= 0) return err("jumlahKg harus angka > 0");

  const created = await prisma.pakanHarian.create({
    data: { siklusId: siklus!.id, tanggal: body.tanggal, jenisPakan, jumlahKg },
  });
  const peringatanBaru = await evaluasiDanSimpanPeringatan(siklus!.id);
  return NextResponse.json({ ...created, peringatanBaru }, { status: 201 });
}
