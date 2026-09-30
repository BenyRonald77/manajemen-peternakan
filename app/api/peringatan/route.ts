import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("terbaca");
  const where = q === "true" ? { terbaca: true } : q === "false" ? { terbaca: false } : {};
  const rows = await prisma.peringatan.findMany({
    where,
    orderBy: { id: "desc" },
    include: { siklus: { include: { kandang: true } } },
  });
  return NextResponse.json(rows);
}
