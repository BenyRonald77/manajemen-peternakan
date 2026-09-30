export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export const nowIso = () => new Date().toISOString();

export const isValidDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00").getTime());

export const isFutureDate = (s: string) => s > today();

export const tipeLabel: Record<string, string> = {
  ayam_broiler: "Ayam Broiler",
  ayam_petelur: "Ayam Petelur",
  lele: "Lele",
  nila: "Nila",
};

export const tipePeringatanLabel: Record<string, string> = {
  mortalitas_tinggi: "Mortalitas Tinggi",
  fcr_tinggi: "FCR Tinggi",
  adg_rendah: "ADG Rendah",
};

export const fmtNum = (n: number, digits = 2) =>
  Number.isFinite(n) ? n.toLocaleString("id-ID", { maximumFractionDigits: digits }) : "-";
