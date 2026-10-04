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
const rtdR = [198, 182, 241, 205, 228, 270, 231, 0, 0, 0, 0, 0];
const rtsR = [61, 66, 70, 58, 74, 88, 69, 0, 0, 0, 0, 0];
const rtdLY = [180, 170, 205, 190, 210, 230, 220, 225, 210, 200, 195, 220];
const rtsLY = [55, 52, 60, 58, 63, 70, 66, 64, 61, 58, 57, 63];
export const CLOSED_MONTHS = 7;
const JT = 1_000_000;
export const monthly = MONTHS.map((m, i) => ({
  month: m,
  rtdTarget: rtdT[i] * JT, rtsTarget: rtsT[i] * JT,
  rtdReal: rtdR[i] * JT, rtsReal: rtsR[i] * JT,
  rtdLY: rtdLY[i] * JT, rtsLY: rtsLY[i] * JT,
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
