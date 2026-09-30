import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { err } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.peringatan.findUnique({ where: { id } });
  if (!row) return err("Peringatan tidak ditemukan", 404);
  const body = await req.json().catch(() => null);
  if (body?.terbaca !== true) return err("terbaca harus true");
  const updated = await prisma.peringatan.update({ where: { id }, data: { terbaca: true } });
  return NextResponse.json(updated);
}
