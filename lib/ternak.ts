// Logika bisnis peternakan: FCR, mortalitas kumulatif, ADG, proyeksi panen,
// dan evaluasi peringatan otomatis.

export interface Standar {
  target_fcr: number;
  mortalitas_maks_persen: number;
  target_bobot_panen_gram: number;
  lama_siklus_hari: number;
}

/** Bobot DOC (day old chick) asumsi dalam gram — dipakai sebagai biomassa awal. */
export const BOBOT_AWAL_GRAM = 40;

export function parseStandar(json: string): Standar {
  const s = JSON.parse(json) as Standar;
  if (
    typeof s.target_fcr !== "number" ||
    typeof s.mortalitas_maks_persen !== "number" ||
    typeof s.target_bobot_panen_gram !== "number" ||
    typeof s.lama_siklus_hari !== "number"
  ) {
    throw new Error("standar tidak valid");
  }
  return s;
}

export function defaultStandar(tipe: string): Standar {
  switch (tipe) {
    case "ayam_broiler":
      return { target_fcr: 1.6, mortalitas_maks_persen: 5, target_bobot_panen_gram: 2000, lama_siklus_hari: 35 };
    case "ayam_petelur":
      return { target_fcr: 2.2, mortalitas_maks_persen: 5, target_bobot_panen_gram: 1700, lama_siklus_hari: 120 };
    case "lele":
      return { target_fcr: 1.2, mortalitas_maks_persen: 10, target_bobot_panen_gram: 125, lama_siklus_hari: 90 };
    case "nila":
      return { target_fcr: 1.5, mortalitas_maks_persen: 10, target_bobot_panen_gram: 400, lama_siklus_hari: 120 };
    default:
      return { target_fcr: 1.8, mortalitas_maks_persen: 5, target_bobot_panen_gram: 1500, lama_siklus_hari: 60 };
  }
}

/**
 * FCR = total pakan (kg) / pertambahan biomassa (kg).
 * Pertambahan biomassa = (populasiAkhir × bobotRataKg) − (populasiAwal × bobotAwalKg).
 * Mengembalikan null jika data belum cukup untuk dihitung.
 */
export function hitungFCR(
  totalPakanKg: number,
  populasiAkhir: number,
  bobotRataGram: number | null,
  populasiAwal: number
): number | null {
  if (bobotRataGram == null || bobotRataGram <= 0) return null;
  if (totalPakanKg <= 0 || populasiAkhir <= 0 || populasiAwal <= 0) return null;
  const biomassaAkhirKg = (populasiAkhir * bobotRataGram) / 1000;
  const biomassaAwalKg = (populasiAwal * BOBOT_AWAL_GRAM) / 1000;
  const gainKg = biomassaAkhirKg - biomassaAwalKg;
  if (gainKg <= 0) return null;
  return totalPakanKg / gainKg;
}

/** Mortalitas kumulatif dalam persen. */
export function hitungMortalitasKumulatif(totalMati: number, populasiAwal: number): number {
  if (populasiAwal <= 0) return 0;
  return (totalMati / populasiAwal) * 100;
}

export interface SampelBobot {
  tanggal: string;
  bobotRataGram: number;
}

/**
 * ADG (average daily gain, gram/hari) dari dua catatan bobot terakhir.
 * null jika kurang dari 2 catatan atau selisih hari tidak valid.
 */
export function hitungADG(sampel: SampelBobot[]): number | null {
  if (sampel.length < 2) return null;
  const sorted = [...sampel].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const s1 = sorted[sorted.length - 2];
  const s2 = sorted[sorted.length - 1];
  const hari =
    (new Date(s2.tanggal + "T00:00:00").getTime() - new Date(s1.tanggal + "T00:00:00").getTime()) /
    86400000;
  if (hari <= 0) return null;
  return (s2.bobotRataGram - s1.bobotRataGram) / hari;
}

/** ADG standar turunan dari target siklus: (target − bobot awal) / lama siklus. */
export function standarADG(standar: Standar): number {
  return (standar.target_bobot_panen_gram - BOBOT_AWAL_GRAM) / standar.lama_siklus_hari;
}

export interface ProyeksiPanen {
  tanggalPanenEstimasi: string | null;
  hariMenujuPanen: number | null;
  estimasiBobotPanenKg: number | null;
  estimasiPopulasiPanen: number;
}

/**
 * Proyeksi panen: estimasi tanggal saat bobot mencapai target berdasarkan ADG,
 * dan estimasi total biomassa panen (kg) pada populasi saat ini.
 */
export function proyeksiPanen(
  bobotTerakhirGram: number | null,
  tanggalBobotTerakhir: string | null,
  adg: number | null,
  standar: Standar,
  populasiSaatIni: number
): ProyeksiPanen {
  const base: ProyeksiPanen = {
    tanggalPanenEstimasi: null,
    hariMenujuPanen: null,
    estimasiBobotPanenKg: null,
    estimasiPopulasiPanen: populasiSaatIni,
  };
  if (bobotTerakhirGram == null || tanggalBobotTerakhir == null || adg == null || adg <= 0) {
    return base;
  }
  const sisa = standar.target_bobot_panen_gram - bobotTerakhirGram;
  if (sisa <= 0) {
    return {
      ...base,
      tanggalPanenEstimasi: tanggalBobotTerakhir,
      hariMenujuPanen: 0,
      estimasiBobotPanenKg: (populasiSaatIni * bobotTerakhirGram) / 1000,
    };
  }
  const hari = Math.ceil(sisa / adg);
  const d = new Date(tanggalBobotTerakhir + "T00:00:00");
  d.setDate(d.getDate() + hari);
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return {
    tanggalPanenEstimasi: ymd,
    hariMenujuPanen: hari,
    estimasiBobotPanenKg: (populasiSaatIni * standar.target_bobot_panen_gram) / 1000,
    estimasiPopulasiPanen: populasiSaatIni,
  };
}

// ---------------------------------------------------------------------------
// Evaluasi peringatan otomatis
// ---------------------------------------------------------------------------

export interface DataEvaluasi {
  totalMati: number;
  populasiAwal: number;
  totalPakanKg: number;
  populasiSaatIni: number;
  bobotTerakhirGram: number | null;
  sampelBobot: SampelBobot[];
  standar: Standar;
}

export interface PeringatanBaru {
  tipe: string;
  pesan: string;
}

/**
 * Evaluasi tiga aturan peringatan. Mengembalikan daftar peringatan yang layak
 * dibuat (dedup per tipe ditangani pemanggil dengan cek peringatan belum terbaca).
 */
export function evaluasiPeringatan(data: DataEvaluasi): PeringatanBaru[] {
  const hasil: PeringatanBaru[] = [];
  const { standar } = data;

  // 1. Mortalitas kumulatif melebihi ambang standar
  const mort = hitungMortalitasKumulatif(data.totalMati, data.populasiAwal);
  if (mort > standar.mortalitas_maks_persen) {
    hasil.push({
      tipe: "mortalitas_tinggi",
      pesan: `Mortalitas kumulatif ${mort.toFixed(2)}% melebihi batas standar ${standar.mortalitas_maks_persen}% (${data.totalMati} ekor dari ${data.populasiAwal}).`,
    });
  }

  // 2. FCR berjalan menyimpang > 10% di atas target
  const fcr = hitungFCR(
    data.totalPakanKg,
    data.populasiSaatIni,
    data.bobotTerakhirGram,
    data.populasiAwal
  );
  if (fcr != null && fcr > standar.target_fcr * 1.1) {
    hasil.push({
      tipe: "fcr_tinggi",
      pesan: `FCR berjalan ${fcr.toFixed(2)} menyimpang lebih dari 10% dari target ${standar.target_fcr}. Periksa kualitas/efisiensi pakan.`,
    });
  }

  // 3. ADG di bawah standar pada 2 pencatatan berturut-turut.
  //    Hitung ADG untuk dua interval terakhir dari 3 sampel terakhir.
  if (data.sampelBobot.length >= 3) {
    const sorted = [...data.sampelBobot].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const tiga = sorted.slice(-3);
    const adg1 = hitungADG(tiga.slice(0, 2));
    const adg2 = hitungADG(tiga.slice(1, 3));
    const batas = standarADG(standar);
    if (adg1 != null && adg2 != null && adg1 < batas && adg2 < batas) {
      hasil.push({
        tipe: "adg_rendah",
        pesan: `ADG ${adg2.toFixed(1)} g/hari di bawah standar ${batas.toFixed(1)} g/hari selama 2 pencatatan berturut-turut. Evaluasi pakan & kesehatan ternak.`,
      });
    }
  }

  return hasil;
}
