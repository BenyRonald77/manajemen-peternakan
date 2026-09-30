import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, requireSiklusBerjalan, validasiTanggal, evaluasiDanSimpanPeringatan } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const rows = await prisma.mortalitas.findMany({
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
  const jumlahEkor = Number(body?.jumlahEkor);
  if (!Number.isInteger(jumlahEkor) || jumlahEkor <= 0)
    return err("jumlahEkor harus bilangan bulat > 0");
  const penyebab =
    typeof body?.penyebab === "string" && body.penyebab.trim() !== ""
      ? body.penyebab.trim()
      : null;

  const created = await prisma.mortalitas.create({
    data: { siklusId: siklus!.id, tanggal: body.tanggal, jumlahEkor, penyebab },
  });
  const peringatanBaru = await evaluasiDanSimpanPeringatan(siklus!.id);
  return NextResponse.json({ ...created, peringatanBaru }, { status: 201 });
}
