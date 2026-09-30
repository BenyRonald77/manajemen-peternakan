import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.siklus.findUnique({
    where: { id },
    include: { kandang: true },
  });
  if (!row) return err("Siklus tidak ditemukan", 404);
  return NextResponse.json(row);
}

// Tutup siklus: { status: "selesai" }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.siklus.findUnique({ where: { id } });
  if (!row) return err("Siklus tidak ditemukan", 404);
  if (row.status !== "berjalan") return err("Siklus sudah selesai", 409);
  const body = await req.json().catch(() => null);
  if (body?.status !== "selesai") return err("status hanya bisa diubah menjadi 'selesai'");
  const updated = await prisma.siklus.update({
    where: { id },
    data: { status: "selesai" },
    include: { kandang: true },
  });
  return NextResponse.json(updated);
}
