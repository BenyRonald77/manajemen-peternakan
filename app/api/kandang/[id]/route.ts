import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err } from "@/lib/api-helpers";

const TIPE_VALID = ["ayam_broiler", "ayam_petelur", "lele", "nila"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.kandang.findUnique({
    where: { id },
    include: { siklus: { orderBy: { id: "desc" } } },
  });
  if (!row) return err("Kandang tidak ditemukan", 404);
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.kandang.findUnique({ where: { id } });
  if (!row) return err("Kandang tidak ditemukan", 404);
  const body = await req.json().catch(() => null);
  const data: { nama?: string; tipe?: string; kapasitas?: number } = {};
  if (body?.nama !== undefined) {
    const nama = String(body.nama).trim();
    if (!nama) return err("nama kandang tidak boleh kosong");
    data.nama = nama;
  }
  if (body?.tipe !== undefined) {
    if (!TIPE_VALID.includes(body.tipe)) return err(`tipe harus salah satu: ${TIPE_VALID.join(", ")}`);
    data.tipe = body.tipe;
  }
  if (body?.kapasitas !== undefined) {
    const k = Number(body.kapasitas);
    if (!Number.isFinite(k) || k <= 0) return err("kapasitas harus angka > 0");
    data.kapasitas = Math.floor(k);
  }
  const updated = await prisma.kandang.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.kandang.findUnique({
    where: { id },
    include: { _count: { select: { siklus: true } } },
  });
  if (!row) return err("Kandang tidak ditemukan", 404);
  if (row._count.siklus > 0)
    return err("Kandang tidak bisa dihapus karena sudah memiliki data siklus", 409);
  await prisma.kandang.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
