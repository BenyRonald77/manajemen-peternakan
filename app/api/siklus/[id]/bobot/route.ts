import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, requireSiklusBerjalan, validasiTanggal, evaluasiDanSimpanPeringatan } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const rows = await prisma.bobotSampel.findMany({
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
  const jumlahSampel = Number(body?.jumlahSampel);
  if (!Number.isInteger(jumlahSampel) || jumlahSampel <= 0)
    return err("jumlahSampel harus bilangan bulat > 0");
  const bobotRataGram = Number(body?.bobotRataGram);
  if (!Number.isFinite(bobotRataGram) || bobotRataGram <= 0)
    return err("bobotRataGram harus angka > 0");

  const created = await prisma.bobotSampel.create({
    data: {
      siklusId: siklus!.id,
      tanggal: body.tanggal,
      jumlahSampel,
      bobotRataGram,
    },
  });
  const peringatanBaru = await evaluasiDanSimpanPeringatan(siklus!.id);
  return NextResponse.json({ ...created, peringatanBaru }, { status: 201 });
}
