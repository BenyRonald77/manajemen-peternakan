"use client";
import { useEffect, useState } from "react";
import { tipePeringatanLabel, today, fmtNum } from "@/lib/format";

interface Analisis {
  siklusId: number;
  status: string;
  populasiAwal: number;
  populasiSaatIni: number;
  totalMati: number;
  mortalitasPersen: number;
  totalPakanKg: number;
  bobotTerakhirGram: number | null;
  fcr: number | null;
  adgGramPerHari: number | null;
  hariBerjalan: number;
  standar: {
    target_fcr: number;
    mortalitas_maks_persen: number;
    target_bobot_panen_gram: number;
    lama_siklus_hari: number;
  };
  proyeksi: {
    tanggalPanenEstimasi: string | null;
    hariMenujuPanen: number | null;
    estimasiBobotPanenKg: number | null;
    estimasiPopulasiPanen: number;
  };
}

interface Pakan {
  id: number;
  tanggal: string;
  jenisPakan: string;
  jumlahKg: number;
}
interface Mati {
  id: number;
  tanggal: string;
  jumlahEkor: number;
  penyebab: string | null;
}
interface Bobot {
  id: number;
  tanggal: string;
  jumlahSampel: number;
  bobotRataGram: number;
}
interface Peringatan {
  id: number;
  tanggal: string;
  tipe: string;
  pesan: string;
  terbaca: boolean;
  siklus: { id: number };
}

function Kartu({ label, nilai, sub }: { label: string; nilai: string; sub?: string }) {
  return (
    <div className="bg-white rounded shadow p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold">{nilai}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function DetailSiklus({ params }: { params: { id: string } }) {
  const id = params.id;
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [pakan, setPakan] = useState<Pakan[]>([]);
  const [mati, setMati] = useState<Mati[]>([]);
  const [bobot, setBobot] = useState<Bobot[]>([]);
  const [peringatan, setPeringatan] = useState<Peringatan[]>([]);
  const [errMsg, setErrMsg] = useState("");

  // form state
  const [fPakan, setFPakan] = useState({ tanggal: today(), jenisPakan: "Starter", jumlahKg: "" });
  const [fMati, setFMati] = useState({ tanggal: today(), jumlahEkor: "", penyebab: "" });
  const [fBobot, setFBobot] = useState({ tanggal: today(), jumlahSampel: "", bobotRataGram: "" });

  const muat = () => {
    fetch(`/api/siklus/${id}/analisis`).then((r) => r.json()).then(setAnalisis);
    fetch(`/api/siklus/${id}/pakan`).then((r) => r.json()).then(setPakan);
    fetch(`/api/siklus/${id}/mortalitas`).then((r) => r.json()).then(setMati);
    fetch(`/api/siklus/${id}/bobot`).then((r) => r.json()).then(setBobot);
    fetch(`/api/peringatan?terbaca=false`)
      .then((r) => r.json())
      .then((rows: Peringatan[]) =>
        setPeringatan(rows.filter((p) => p.siklus && p.siklus.id === Number(id)))
      );
  };
  useEffect(muat, [id]);

  const kirim = async (jenis: "pakan" | "mortalitas" | "bobot", body: object) => {
    setErrMsg("");
    const r = await fetch(`/api/siklus/${id}/${jenis}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) {
      setErrMsg(j.error ?? "Gagal menyimpan");
      return;
    }
    if (j.peringatanBaru?.length) {
      alert(`Peringatan baru: ${j.peringatanBaru.join(", ")}`);
    }
    muat();
  };

  // tren mingguan: agregat bobot rata-rata & total pakan per minggu
  const minggu: { label: string; bobot: number | null; pakan: number }[] = [];
  if (analisis) {
    const byWeek = new Map<string, { bobot: number[]; pakan: number }>();
    const t0 = analisis ? bobot.map((b) => b.tanggal).sort()[0] : null;
    const key = (tgl: string) => {
      if (!t0) return "M1";
      const w = Math.floor(
        (new Date(tgl + "T00:00:00").getTime() - new Date(t0 + "T00:00:00").getTime()) / 604800000
      );
      return `M${w + 1}`;
    };
    for (const b of bobot) {
      const k = key(b.tanggal);
      if (!byWeek.has(k)) byWeek.set(k, { bobot: [], pakan: 0 });
      byWeek.get(k)!.bobot.push(b.bobotRataGram);
    }
    for (const p of pakan) {
      const k = key(p.tanggal);
      if (!byWeek.has(k)) byWeek.set(k, { bobot: [], pakan: 0 });
      byWeek.get(k)!.pakan += p.jumlahKg;
    }
    const entries: { label: string; bobot: number[]; pakan: number }[] = [];
    byWeek.forEach((v, label) => entries.push({ label, bobot: v.bobot, pakan: v.pakan }));
    entries.sort((a, b) => a.label.localeCompare(b.label));
    for (const e of entries) {
      minggu.push({
        label: e.label,
        bobot: e.bobot.length ? e.bobot.reduce((a, b) => a + b, 0) / e.bobot.length : null,
        pakan: e.pakan,
      });
    }
  }
  const maxBobot = Math.max(1, ...minggu.map((m) => m.bobot ?? 0));
  const maxPakan = Math.max(1, ...minggu.map((m) => m.pakan));

  const peringatanSiklus = peringatan;  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Siklus #{id}</h2>
        <a href="/siklus" className="text-sm text-emerald-700 underline">
          ← Kembali
        </a>
      </div>
      {errMsg && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{errMsg}</p>}

      {analisis && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kartu label="Populasi saat ini" nilai={analisis.populasiSaatIni.toLocaleString("id-ID")} sub={`awal ${analisis.populasiAwal.toLocaleString("id-ID")} · hari ke-${analisis.hariBerjalan}`} />
            <Kartu label="Mortalitas" nilai={`${fmtNum(analisis.mortalitasPersen)}%`} sub={`${analisis.totalMati} ekor · batas ${analisis.standar.mortalitas_maks_persen}%`} />
            <Kartu label="Total pakan" nilai={`${fmtNum(analisis.totalPakanKg, 1)} kg`} />
            <Kartu label="FCR" nilai={analisis.fcr != null ? fmtNum(analisis.fcr) : "-"} sub={`target ${analisis.standar.target_fcr}`} />
            <Kartu label="ADG" nilai={analisis.adgGramPerHari != null ? `${fmtNum(analisis.adgGramPerHari, 1)} g/hari` : "-"} />
            <Kartu label="Bobot terakhir" nilai={analisis.bobotTerakhirGram != null ? `${fmtNum(analisis.bobotTerakhirGram, 1)} g` : "-"} sub={`target panen ${analisis.standar.target_bobot_panen_gram} g`} />
            <Kartu label="Proyeksi panen" nilai={analisis.proyeksi.tanggalPanenEstimasi ?? "-"} sub={analisis.proyeksi.hariMenujuPanen != null ? `${analisis.proyeksi.hariMenujuPanen} hari lagi` : "butuh data ADG"} />
            <Kartu label="Estimasi biomassa panen" nilai={analisis.proyeksi.estimasiBobotPanenKg != null ? `${fmtNum(analisis.proyeksi.estimasiBobotPanenKg, 1)} kg` : "-"} sub={`${analisis.proyeksi.estimasiPopulasiPanen.toLocaleString("id-ID")} ekor`} />
          </div>

          {minggu.length > 0 && (
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-semibold mb-3">Tren Mingguan</h3>
              <div className="space-y-2">
                {minggu.map((m) => (
                  <div key={m.label} className="text-xs">
                    <div className="font-medium mb-1">{m.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-slate-500">Bobot</span>
                      <div className="flex-1 bg-slate-100 rounded h-4">
                        <div
                          className="bg-emerald-500 h-4 rounded"
                          style={{ width: `${((m.bobot ?? 0) / maxBobot) * 100}%` }}
                        />
                      </div>
                      <span className="w-20 text-right">{m.bobot != null ? `${fmtNum(m.bobot, 0)} g` : "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-16 text-slate-500">Pakan</span>
                      <div className="flex-1 bg-slate-100 rounded h-4">
                        <div
                          className="bg-amber-500 h-4 rounded"
                          style={{ width: `${(m.pakan / maxPakan) * 100}%` }}
                        />
                      </div>
                      <span className="w-20 text-right">{fmtNum(m.pakan, 1)} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {analisis?.status === "berjalan" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form
            className="bg-white rounded shadow p-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              kirim("pakan", { ...fPakan, jumlahKg: Number(fPakan.jumlahKg) });
            }}
          >
            <h3 className="font-semibold">Catat Pakan</h3>
            <input type="date" className="border rounded px-2 py-1 w-full text-sm" value={fPakan.tanggal} onChange={(e) => setFPakan({ ...fPakan, tanggal: e.target.value })} />
            <input className="border rounded px-2 py-1 w-full text-sm" placeholder="Jenis pakan" value={fPakan.jenisPakan} onChange={(e) => setFPakan({ ...fPakan, jenisPakan: e.target.value })} />
            <input type="number" step="0.01" min="0" className="border rounded px-2 py-1 w-full text-sm" placeholder="Jumlah (kg)" value={fPakan.jumlahKg} onChange={(e) => setFPakan({ ...fPakan, jumlahKg: e.target.value })} />
            <button className="bg-emerald-700 text-white text-sm px-3 py-1 rounded">Simpan</button>
          </form>
          <form
            className="bg-white rounded shadow p-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              kirim("mortalitas", { ...fMati, jumlahEkor: Number(fMati.jumlahEkor) });
            }}
          >
            <h3 className="font-semibold">Catat Mortalitas</h3>
            <input type="date" className="border rounded px-2 py-1 w-full text-sm" value={fMati.tanggal} onChange={(e) => setFMati({ ...fMati, tanggal: e.target.value })} />
            <input type="number" min="1" className="border rounded px-2 py-1 w-full text-sm" placeholder="Jumlah (ekor)" value={fMati.jumlahEkor} onChange={(e) => setFMati({ ...fMati, jumlahEkor: e.target.value })} />
            <input className="border rounded px-2 py-1 w-full text-sm" placeholder="Penyebab (opsional)" value={fMati.penyebab} onChange={(e) => setFMati({ ...fMati, penyebab: e.target.value })} />
            <button className="bg-emerald-700 text-white text-sm px-3 py-1 rounded">Simpan</button>
          </form>
          <form
            className="bg-white rounded shadow p-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              kirim("bobot", {
                ...fBobot,
                jumlahSampel: Number(fBobot.jumlahSampel),
                bobotRataGram: Number(fBobot.bobotRataGram),
              });
            }}
          >
            <h3 className="font-semibold">Catat Bobot Sampel</h3>
            <input type="date" className="border rounded px-2 py-1 w-full text-sm" value={fBobot.tanggal} onChange={(e) => setFBobot({ ...fBobot, tanggal: e.target.value })} />
            <input type="number" min="1" className="border rounded px-2 py-1 w-full text-sm" placeholder="Jumlah sampel" value={fBobot.jumlahSampel} onChange={(e) => setFBobot({ ...fBobot, jumlahSampel: e.target.value })} />
            <input type="number" step="0.1" min="0" className="border rounded px-2 py-1 w-full text-sm" placeholder="Bobot rata-rata (gram)" value={fBobot.bobotRataGram} onChange={(e) => setFBobot({ ...fBobot, bobotRataGram: e.target.value })} />
            <button className="bg-emerald-700 text-white text-sm px-3 py-1 rounded">Simpan</button>
          </form>
        </div>
      )}

      {peringatanSiklus.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Peringatan Siklus Ini</h3>
          {peringatanSiklus.map((p) => (
            <div key={p.id} className="bg-amber-50 border border-amber-300 rounded p-3 text-sm">
              <span className="font-semibold text-amber-800">
                {tipePeringatanLabel[p.tipe] ?? p.tipe}
              </span>{" "}
              · {p.tanggal}
              <div className="mt-1">{p.pesan}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Riwayat Pakan</h3>
          <table className="w-full">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Tanggal</th><th>Jenis</th><th className="text-right">Kg</th></tr></thead>
            <tbody>
              {pakan.slice(0, 10).map((p) => (
                <tr key={p.id} className="border-t"><td className="py-1">{p.tanggal}</td><td>{p.jenisPakan}</td><td className="text-right">{fmtNum(p.jumlahKg, 1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Riwayat Mortalitas</h3>
          <table className="w-full">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Tanggal</th><th className="text-right">Ekor</th><th>Penyebab</th></tr></thead>
            <tbody>
              {mati.slice(0, 10).map((m) => (
                <tr key={m.id} className="border-t"><td className="py-1">{m.tanggal}</td><td className="text-right">{m.jumlahEkor}</td><td>{m.penyebab ?? "-"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Riwayat Bobot</h3>
          <table className="w-full">
            <thead><tr className="text-left text-slate-500"><th className="py-1">Tanggal</th><th className="text-right">Sampel</th><th className="text-right">Rata-rata (g)</th></tr></thead>
            <tbody>
              {bobot.slice(0, 10).map((b) => (
                <tr key={b.id} className="border-t"><td className="py-1">{b.tanggal}</td><td className="text-right">{b.jumlahSampel}</td><td className="text-right">{fmtNum(b.bobotRataGram, 1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
