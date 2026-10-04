import Papa from "papaparse";
import { classifyBrand, type Channel, type PackCat } from "@/lib/sosro-data";

export interface DmsRow {
  y: number; m: number; d: number; ch: Channel; sales: string; cust: string; sku: string;
  brand: string; cat: PackCat | null; rts: boolean; amt: number; ctn: number; code: string; sale: boolean;
}

/** Salesman master: name -> filter channel + display badge */
export const SALES_MASTER: { key: string; name: string; channel: Channel; badge: string }[] = [
  { key: "NANANG", name: "Nanang", channel: "Horeca", badge: "HORECA" },
  { key: "NOVITA", name: "Novita", channel: "MT", badge: "MOT" },
  { key: "NKA SOS", name: "NKA SOS", channel: "NKA", badge: "NKA" },
  { key: "BACHTIAR", name: "Bachtiar", channel: "GT", badge: "GT" },
  { key: "EDY", name: "Edy", channel: "GT", badge: "GT" },
  { key: "FITRI", name: "Fitri Yani", channel: "GT", badge: "GT" },
];
export function masterOf(raw: string) {
  const s = raw.toUpperCase().trim();
  const t = s.replace(/^BAHTIAR/, "BACHTIAR");
  return SALES_MASTER.find((m) => t === m.key || t.startsWith(m.key + " ") || t.includes(m.key));
}
export function classifyChannel(raw: string): Channel {
  const s = raw.toUpperCase();
  if (s.includes("NKA") || s.includes("KEY ACC")) return "NKA";
  if (s.includes("HORECA") || s.includes("HOTEL") || s.includes("RESTO")) return "Horeca";
  if (s.includes("MT") || s.includes("MODERN") || s.includes("LOKMAN") || s.includes("MOT")) return "MT";
  return "GT";
}
/** Normalized salesman id used for filtering */
export const salesId = (raw: string) => masterOf(raw)?.key ?? raw.toUpperCase().trim();

const num = (v: unknown) => {
  if (v == null) return 0;
  let s = String(v).replace(/[^0-9,.-]/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/,/g, "");
  return Number(s) || 0;
};
function parseDate(v: string): { y: number; m: number; d: number } | null {
  const p = String(v || "").trim().split(/[/\-. ]/).map(Number);
  if (p.length < 3 || p.some(isNaN)) return null;
  if (p[0]! > 1000) return { y: p[0]!, m: p[1]!, d: p[2]! }; // ISO
  let [a, b, y] = p as [number, number, number];
  if (y < 100) y += 2000;
  // Default DD/MM/YYYY; switch to M/D/YYYY if second part > 12
  return b > 12 ? { y, m: a, d: b } : { y, m: b, d: a };
}

const RTS_KEYS = ["GUNUNG SLAMAT", "BOTOL BIRU", "BOTOL HIJAU", "POCI", "CELUP"];

function mapRow(r: Record<string, string>): DmsRow | null {
  const g = (k: string) => r[k] ?? "";
  let dt = parseDate(g("TANGGAL"));
  if (!dt) {
    const tb = g("TAHUN-BULAN").match(/(\d{4})\D*(\d{1,2})/);
    if (tb) dt = { y: +tb[1]!, m: +tb[2]!, d: 1 };
  }
  const bulan = num(g("BULAN"));
  if (!dt && !bulan) return null;
  const m = bulan >= 1 && bulan <= 12 ? bulan : dt!.m;
  const brand = g("BRAND") || g("PRODUCTGROUP3");
  const cls = `${g("BRAND")} ${g("PRODUCTGROUP3")} ${g("NAMAPRODUK")} ${g("PACKAGING")}`;
  // Revenue basis = DPP (excl. 11% PPN); fallback NETAMOUNT / 1.11
  const dppRaw = g("DPP").trim();
  let amt = dppRaw ? num(dppRaw) : num(g("NETAMOUNT")) / 1.11;
  const tipe = g("TIPETRANS").toLowerCase();
  const isReturn = /retur/.test(tipe);
  if (isReturn && amt > 0) amt = -amt; // returns reduce net sales (no double-negation)
  const sales = g("NAMASALESMAN") || g("KODESALESMAN");
  const master = masterOf(sales);
  const up = cls.toUpperCase();
  const rts = RTS_KEYS.some((k) => up.includes(k));
  return {
    y: dt?.y ?? new Date().getFullYear(), m, d: dt?.d ?? 1,
    ch: master?.channel ?? classifyChannel(g("CHANNEL")),
    sales: salesId(sales), cust: g("NAMACUSTOMER") || g("KODECUSTOMER"), sku: g("NAMAPRODUK") || g("KODEPRODUK"),
    brand, cat: rts ? "RTS" : classifyBrand(cls), rts, amt, ctn: num(g("QTYSOLDCRT")) || num(g("QTYSOLD")),
    code: g("KODEPRODUK").trim(), sale: !isReturn && amt > 0 && (!tipe || tipe.includes("sales")),
  };
}

/** Turn any Google Sheets URL into a CORS-friendly CSV export URL. */
export function toCsvUrl(url: string) {
  const id = url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return url;
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ""}`;
}

export function parseDms(input: string | File): Promise<DmsRow[]> {
  return new Promise((resolve, reject) => {
    const out: DmsRow[] = [];
    Papa.parse<Record<string, string>>(input as File, {
      header: true, skipEmptyLines: true, worker: false,
      transformHeader: (h) => h.trim().toUpperCase().replace(/\s+/g, ""),
      chunk: (res) => { for (const r of res.data) { const x = mapRow(r); if (x) out.push(x); } },
      complete: () => resolve(out), error: (e: Error) => reject(e),
    });
  });
}

export async function fetchDms(url: string): Promise<DmsRow[]> {
  const res = await fetch(toCsvUrl(url));
  if (!res.ok) throw new Error(`Gagal mengambil sheet [${res.status}] — pastikan sheet dibagikan "Siapa saja yang memiliki link".`);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) throw new Error("Sheet tidak publik — bagikan ke \"Siapa saja yang memiliki link\".");
  return parseDms(text);
}
