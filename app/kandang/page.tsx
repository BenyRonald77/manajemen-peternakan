"use client";
import { useEffect, useState } from "react";
import { tipeLabel } from "@/lib/format";

interface Kandang {
  id: number;
  nama: string;
  tipe: string;
  kapasitas: number;
  _count: { siklus: number };
}

const TIPE = ["ayam_broiler", "ayam_petelur", "lele", "nila"];

export default function KandangPage() {
  const [rows, setRows] = useState<Kandang[]>([]);
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState(TIPE[0]);
  const [kapasitas, setKapasitas] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const muat = () => fetch("/api/kandang").then((r) => r.json()).then(setRows);
  useEffect(muat, []);

  const tambah = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    const r = await fetch("/api/kandang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, tipe, kapasitas: Number(kapasitas) }),
    });
    if (!r.ok) {
      const j = await r.json();
      setErrMsg(j.error ?? "Gagal menyimpan");
      return;
    }
    setNama("");
    setKapasitas("");
    muat();
  };

  const hapus = async (id: number) => {
    if (!confirm("Hapus kandang ini?")) return;
    const r = await fetch(`/api/kandang/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json();
      alert(j.error ?? "Gagal menghapus");
      return;
    }
    muat();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Kandang</h2>

      <form onSubmit={tambah} className="bg-white rounded shadow p-4 space-y-3 max-w-lg">
        <h3 className="font-semibold">Tambah Kandang</h3>
        {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Nama kandang"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />
        <div className="flex gap-3">
          <select
            className="border rounded px-3 py-2"
            value={tipe}
            onChange={(e) => setTipe(e.target.value)}
          >
            {TIPE.map((t) => (
              <option key={t} value={t}>
                {tipeLabel[t]}
              </option>
            ))}
          </select>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Kapasitas (ekor)"
            type="number"
            min={1}
            value={kapasitas}
            onChange={(e) => setKapasitas(e.target.value)}
          />
        </div>
        <button className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800">
          Simpan
        </button>
      </form>

      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className="p-2">Nama</th>
            <th className="p-2">Tipe</th>
            <th className="p-2">Kapasitas</th>
            <th className="p-2">Siklus</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => (
            <tr key={k.id} className="border-t">
              <td className="p-2 font-medium">{k.nama}</td>
              <td className="p-2">{tipeLabel[k.tipe] ?? k.tipe}</td>
              <td className="p-2">{k.kapasitas.toLocaleString("id-ID")}</td>
              <td className="p-2">{k._count.siklus}</td>
              <td className="p-2 text-right">
                <button
                  onClick={() => hapus(k.id)}
                  className="text-red-600 hover:underline"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
