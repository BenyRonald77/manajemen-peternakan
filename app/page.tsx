"use client";
import { useEffect, useState } from "react";
import { tipeLabel, tipePeringatanLabel, today } from "@/lib/format";

interface Siklus {
  id: number;
  tanggalMulai: string;
  tanggalPanenRencana: string | null;
  populasiAwal: number;
  status: string;
  kandang: { nama: string; tipe: string };
}

interface Peringatan {
  id: number;
  tanggal: string;
  tipe: string;
  pesan: string;
  siklus: { id: number; kandang: { nama: string } };
}

export default function Dashboard() {
  const [siklus, setSiklus] = useState<Siklus[]>([]);
  const [peringatan, setPeringatan] = useState<Peringatan[]>([]);
  const [loading, setLoading] = useState(true);

  const muat = () => {
    Promise.all([
      fetch("/api/siklus?status=berjalan").then((r) => r.json()),
      fetch("/api/peringatan?terbaca=false").then((r) => r.json()),
    ]).then(([s, p]) => {
      setSiklus(s);
      setPeringatan(p);
      setLoading(false);
    });
  };
  useEffect(muat, []);

  const tandai = async (id: number) => {
    await fetch(`/api/peringatan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terbaca: true }),
    });
    muat();
  };

  if (loading) return <p>Memuat...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard — {today()}</h2>

      <section>
        <h3 className="font-semibold mb-2">Siklus Berjalan ({siklus.length})</h3>
        {siklus.length === 0 && (
          <p className="text-slate-500 text-sm">
            Belum ada siklus berjalan.{" "}
            <a href="/siklus" className="text-emerald-700 underline">
              Mulai siklus baru
            </a>
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {siklus.map((s) => (
            <a
              key={s.id}
              href={`/siklus/${s.id}`}
              className="bg-white rounded shadow p-4 hover:shadow-md block"
            >
              <div className="font-semibold">
                {s.kandang.nama} — {tipeLabel[s.kandang.tipe] ?? s.kandang.tipe}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Populasi awal: {s.populasiAwal.toLocaleString("id-ID")} ekor
              </div>
              <div className="text-sm text-slate-600">
                Mulai: {s.tanggalMulai}
                {s.tanggalPanenRencana ? ` · Rencana panen: ${s.tanggalPanenRencana}` : ""}
              </div>
              <div className="text-emerald-700 text-sm mt-2 underline">Lihat detail →</div>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">
          Peringatan Belum Dibaca ({peringatan.length})
        </h3>
        {peringatan.length === 0 && (
          <p className="text-slate-500 text-sm">Tidak ada peringatan. Semua metrik normal.</p>
        )}
        <div className="space-y-2">
          {peringatan.map((p) => (
            <div key={p.id} className="bg-amber-50 border border-amber-300 rounded p-3 flex justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-amber-800">
                  {tipePeringatanLabel[p.tipe] ?? p.tipe} · {p.siklus.kandang.nama} · {p.tanggal}
                </div>
                <div className="text-sm mt-1">{p.pesan}</div>
              </div>
              <button
                onClick={() => tandai(p.id)}
                className="shrink-0 self-start bg-amber-600 text-white text-xs px-3 py-1 rounded hover:bg-amber-700"
              >
                Tandai dibaca
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
