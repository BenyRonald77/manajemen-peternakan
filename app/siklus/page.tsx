"use client";
import { useEffect, useState } from "react";
import { tipeLabel, today } from "@/lib/format";

interface Kandang {
  id: number;
  nama: string;
  tipe: string;
}
interface Siklus {
  id: number;
  kandangId: number;
  tanggalMulai: string;
  tanggalPanenRencana: string | null;
  populasiAwal: number;
  status: string;
  kandang: { nama: string; tipe: string };
}

export default function SiklusPage() {
  const [rows, setRows] = useState<Siklus[]>([]);
  const [kandang, setKandang] = useState<Kandang[]>([]);
  const [kandangId, setKandangId] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(today());
  const [populasiAwal, setPopulasiAwal] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const muat = () => {
    fetch("/api/siklus").then((r) => r.json()).then(setRows);
    fetch("/api/kandang").then((r) => r.json()).then(setKandang);
  };
  useEffect(muat, []);

  const mulai = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    const r = await fetch("/api/siklus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kandangId: Number(kandangId),
        tanggalMulai,
        populasiAwal: Number(populasiAwal),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErrMsg(j.error ?? "Gagal memulai siklus");
      return;
    }
    setKandangId("");
    setPopulasiAwal("");
    muat();
  };

  const tutup = async (id: number) => {
    if (!confirm("Tutup siklus ini? Pencatatan harian akan dikunci.")) return;
    const r = await fetch(`/api/siklus/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "selesai" }),
    });
    if (!r.ok) {
      const j = await r.json();
      alert(j.error ?? "Gagal menutup siklus");
      return;
    }
    muat();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Siklus Produksi</h2>

      <form onSubmit={mulai} className="bg-white rounded shadow p-4 space-y-3 max-w-lg">
        <h3 className="font-semibold">Mulai Siklus Baru</h3>
        {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}
        <select
          className="border rounded px-3 py-2 w-full"
          value={kandangId}
          onChange={(e) => setKandangId(e.target.value)}
          required
        >
          <option value="">— Pilih kandang —</option>
          {kandang.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama} ({tipeLabel[k.tipe] ?? k.tipe})
            </option>
          ))}
        </select>
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            Tanggal mulai
            <input
              type="date"
              className="border rounded px-3 py-2 w-full mt-1"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
            />
          </label>
          <label className="flex-1 text-sm">
            Populasi awal (ekor)
            <input
              type="number"
              min={1}
              className="border rounded px-3 py-2 w-full mt-1"
              value={populasiAwal}
              onChange={(e) => setPopulasiAwal(e.target.value)}
            />
          </label>
        </div>
        <button className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800">
          Mulai Siklus
        </button>
      </form>

      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className="p-2">ID</th>
            <th className="p-2">Kandang</th>
            <th className="p-2">Mulai</th>
            <th className="p-2">Rencana Panen</th>
            <th className="p-2">Populasi</th>
            <th className="p-2">Status</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{s.id}</td>
              <td className="p-2">
                <a href={`/siklus/${s.id}`} className="text-emerald-700 underline">
                  {s.kandang.nama}
                </a>
              </td>
              <td className="p-2">{s.tanggalMulai}</td>
              <td className="p-2">{s.tanggalPanenRencana ?? "-"}</td>
              <td className="p-2">{s.populasiAwal.toLocaleString("id-ID")}</td>
              <td className="p-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    s.status === "berjalan"
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {s.status}
                </span>
              </td>
              <td className="p-2 text-right">
                {s.status === "berjalan" && (
                  <button onClick={() => tutup(s.id)} className="text-red-600 hover:underline">
                    Tutup
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
