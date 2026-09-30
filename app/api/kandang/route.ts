import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err } from "@/lib/api-helpers";

const TIPE_VALID = ["ayam_broiler", "ayam_petelur", "lele", "nila"];

export async function GET() {
  const rows = await prisma.kandang.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { siklus: true } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const nama = typeof body?.nama === "string" ? body.nama.trim() : "";
  const tipe = body?.tipe;
  const kapasitas = Number(body?.kapasitas);
  if (!nama) return err("nama kandang wajib diisi");
  if (!TIPE_VALID.includes(tipe))
    return err(`tipe harus salah satu: ${TIPE_VALID.join(", ")}`);
  if (!Number.isFinite(kapasitas) || kapasitas <= 0)
    return err("kapasitas harus angka > 0");
  const created = await prisma.kandang.create({
    data: { nama, tipe, kapasitas: Math.floor(kapasitas), createdAt: new Date().toISOString() },
  });
  return NextResponse.json(created, { status: 201 });
}
