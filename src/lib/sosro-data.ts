export type Channel = "NKA" | "MT" | "GT" | "Horeca";
export const CHANNELS: Channel[] = ["NKA", "MT", "GT", "Horeca"];

export interface Rep { id: string; name: string; channel: Channel; weight: number }

const names: Record<Channel, string[]> = {
  NKA: ["Andi Pratama", "Budi Santoso", "Citra Lestari"],
  MT: ["Dewi Anggraini", "Eko Saputra", "Fajar Nugroho", "Gita Permata"],
  GT: ["Hendra Wijaya", "Indah Sari", "Joko Susilo", "Kartika Putri", "Lukman Hakim"],
  Horeca: ["Maya Rahma", "Nanda Kusuma", "Oki Firmansyah"],
};
export const REPS: Rep[] = CHANNELS.flatMap((c) =>
  names[c].map((n, i) => ({ id: `${c}-${i}`, name: n, channel: c, weight: 0.6 + ((n.length * 7 + i * 13) % 10) / 10 })),
);
export const TOTAL_WEIGHT = REPS.reduce((a, r) => a + r.weight, 0);

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
// base values in IDR for full team
const rtdT = [210, 195, 230, 225, 240, 260, 255, 250, 235, 220, 215, 245];
const rtsT = [70, 65, 75, 72, 80, 85, 82, 80, 76, 72, 70, 78];
const rtdR = [198, 182, 241, 205, 228, 270, 231, 244, 226, 238, 0, 0];
const rtsR = [61, 66, 70, 58, 74, 88, 69, 71, 64, 66, 0, 0];
const rtdLY = [180, 170, 205, 190, 210, 230, 220, 225, 210, 200, 195, 220];
const rtsLY = [55, 52, 60, 58, 63, 70, 66, 64, 61, 58, 57, 63];
export const CLOSED_MONTHS = 10;
const JT = 1_000_000;
export const monthly = MONTHS.map((m, i) => ({
  month: m,
  rtdTarget: rtdT[i]! * JT, rtsTarget: rtsT[i]! * JT,
  rtdReal: rtdR[i] ? rtdR[i]! * JT + ((i + 3) * 7919337) % 999983 : 0, rtsReal: rtsR[i] ? rtsR[i]! * JT + ((i + 5) * 3571129) % 999979 : 0,
  rtdLY: rtdLY[i]! * JT, rtsLY: rtsLY[i]! * JT,
}));

export const BRANDS = [
  { name: "Teh Botol Sosro", value: 42 },
  { name: "Fruit Tea", value: 21 },
  { name: "S-Tee", value: 12 },
  { name: "Joy Tea", value: 9 },
  { name: "Prim-A", value: 8 },
  { name: "Lainnya", value: 8 },
];

const outletNames = ["Superindo Kemang", "Alfamart DC Cikarang", "Indomaret DC Bekasi", "Hypermart Puri", "Lotte Grosir Pasar Rebo", "Toko Sinar Jaya", "Hotel Mulia Senayan", "Transmart Cempaka", "Grand Lucky SCBD", "UD Makmur Abadi", "Ranch Market Pondok Indah", "CV Berkah Tirta", "Kopi Kenangan HQ", "Total Buah Segar", "Toko Sumber Rejeki"];
export const OUTLETS = outletNames.map((n, i) => ({
  name: n,
  channel: CHANNELS[i % 4],
  value: Math.round((185 - i * 10.5 - (i % 3) * 2) * JT),
}));

export type Period = "mtd" | "ytd" | "yoy";
// Packaging breakdown: mtd/ytd volume (krat/ctn) & value (IDR), ly = same period 2025
export const PACKAGING = [
  { cat: "AMDK", brand: "Prim-A", mtdVol: 18400, mtdVal: 21.6e9, ytdVol: 121800, ytdVal: 143.2e9, lyYtdVal: 131.0e9, lyMtdVal: 20.1e9 },
  { cat: "PET", brand: "Fruit Tea / Sosro", mtdVol: 26200, mtdVal: 48.3e9, ytdVol: 176500, ytdVal: 322.4e9, lyYtdVal: 289.5e9, lyMtdVal: 44.0e9 },
  { cat: "TETRA", brand: "Teh Kotak / Joy Tea", mtdVol: 15800, mtdVal: 27.9e9, ytdVol: 108200, ytdVal: 189.6e9, lyYtdVal: 196.1e9, lyMtdVal: 29.4e9 },
  { cat: "RGB", brand: "Teh Botol Sosro Returnable Glass", mtdVol: 31500, mtdVal: 39.4e9, ytdVol: 219300, ytdVal: 271.8e9, lyYtdVal: 284.7e9, lyMtdVal: 41.2e9 },
  { cat: "RTS", brand: "Teh Celup / Seduh", mtdVol: 9600, mtdVal: 19.8e9, ytdVol: 67900, ytdVal: 138.5e9, lyYtdVal: 121.9e9, lyMtdVal: 17.6e9 },
  { cat: "CAN", brand: "Tebs / Fruit Tea Can", mtdVol: 7200, mtdVal: 16.1e9, ytdVol: 48100, ytdVal: 107.3e9, lyYtdVal: 99.8e9, lyMtdVal: 15.9e9 },
];

export const STOCK_GROUPS = ["FRUIT TEA CAN", "TEBS CAN", "FRUIT TEA PET K12", "FRUIT TEA PET K24", "RGB", "AMDK", "RTS"] as const;
export type StockGroup = (typeof STOCK_GROUPS)[number];
export interface StockItem { code: string; name: string; group: StockGroup; pack: string; pcsPerCtn: number; price: number; ctn: number; bdp: number; avg: number }
export const STOCK: StockItem[] = [
  { code: "FTC20", name: "Fruit Tea Apel Can", group: "FRUIT TEA CAN", pack: "24 / 318 Ml", pcsPerCtn: 24, price: 118000, ctn: 420, bdp: 120, avg: 38 },
  { code: "FTC21", name: "Fruit Tea Blackcurrant Can", group: "FRUIT TEA CAN", pack: "24 / 318 Ml", pcsPerCtn: 24, price: 118000, ctn: 1650, bdp: 0, avg: 24 },
  { code: "FTC22", name: "Fruit Tea Strawberry Can", group: "FRUIT TEA CAN", pack: "24 / 318 Ml", pcsPerCtn: 24, price: 118000, ctn: 780, bdp: 200, avg: 21 },
  { code: "TSC20", name: "Tebs Sparkling Tea Can", group: "TEBS CAN", pack: "24 / 330 Ml", pcsPerCtn: 24, price: 132000, ctn: 310, bdp: 0, avg: 19 },
  { code: "TSC21", name: "Tebs Lemon Can", group: "TEBS CAN", pack: "24 / 330 Ml", pcsPerCtn: 24, price: 132000, ctn: 540, bdp: 150, avg: 12 },
  { code: "FTE30", name: "Fruit Tea Apel PET", group: "FRUIT TEA PET K12", pack: "12 / 350 Ml", pcsPerCtn: 12, price: 54000, ctn: 2100, bdp: 400, avg: 72 },
  { code: "FTE31", name: "Fruit Tea Blackcurrant PET", group: "FRUIT TEA PET K12", pack: "12 / 350 Ml", pcsPerCtn: 12, price: 54000, ctn: 960, bdp: 0, avg: 64 },
  { code: "FTE33", name: "Fruit Tea Freeze PET", group: "FRUIT TEA PET K24", pack: "24 / 500 Ml", pcsPerCtn: 24, price: 98000, ctn: 2850, bdp: 300, avg: 56 },
  { code: "FTE01", name: "Fruit Tea Xtreme PET", group: "FRUIT TEA PET K24", pack: "24 / 500 Ml", pcsPerCtn: 24, price: 98000, ctn: 640, bdp: 100, avg: 29 },
  { code: "TBS01", name: "Teh Botol Sosro RGB", group: "RGB", pack: "24 / 220 Ml", pcsPerCtn: 24, price: 72000, ctn: 5200, bdp: 800, avg: 164 },
  { code: "TBS02", name: "Teh Botol Sosro Less Sugar RGB", group: "RGB", pack: "24 / 220 Ml", pcsPerCtn: 24, price: 74000, ctn: 900, bdp: 0, avg: 60 },
  { code: "PRA60", name: "Prim-A Air Mineral", group: "AMDK", pack: "24 / 600 Ml", pcsPerCtn: 24, price: 42000, ctn: 3400, bdp: 600, avg: 104 },
  { code: "PRA15", name: "Prim-A Air Mineral 1.5L", group: "AMDK", pack: "12 / 1500 Ml", pcsPerCtn: 12, price: 46000, ctn: 1200, bdp: 0, avg: 14 },
  { code: "TCS25", name: "Teh Celup Sosro", group: "RTS", pack: "48 / 25 Sachet", pcsPerCtn: 48, price: 210000, ctn: 380, bdp: 50, avg: 9 },
  { code: "TSD40", name: "Teh Seduh Sosro", group: "RTS", pack: "40 / 40 Gr", pcsPerCtn: 40, price: 165000, ctn: 150, bdp: 0, avg: 10 },
];
export const TARGET_DOI = 45;

export const JUTA = 1_000_000;
export const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const YEARS = [2026, 2025];

// Centralized master brand & category mapping
export type PackCat = "AMDK" | "PET" | "RGB" | "TETRA" | "CAN" | "RTS";
export const CATEGORY_MAP: Record<PackCat, string[]> = {
  AMDK: ["PRIM-A"],
  PET: ["TEBS PET", "FRUIT TEA PET", "S-TEE", "TEH BOTOL PET"],
  RGB: ["BOTOL KACA"],
  TETRA: ["TEH BOTOL KOTAK", "FRUIT TEA GENGGAM", "COUNTRY CHOICE 1 LT", "COUNTRY CHOICE 250"],
  CAN: ["TEBS CAN", "FRUIT TEA CAN"],
  RTS: ["GUNUNG SLAMAT"],
};
export const macroOf = (c: PackCat): "RTD" | "RTS" => (c === "RTS" ? "RTS" : "RTD");
/** Auto-classify a raw spreadsheet product/brand string into a packaging category. */
export function classifyBrand(raw: string): PackCat | null {
  const s = raw.toUpperCase();
  let best: { c: PackCat; len: number } | null = null;
  for (const [c, keys] of Object.entries(CATEGORY_MAP) as [PackCat, string[]][])
    for (const k of keys) if (s.includes(k) && (!best || k.length > best.len)) best = { c, len: k.length };
  return best?.c ?? null;
}
