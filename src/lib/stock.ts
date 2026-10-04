import Papa from "papaparse";
import { toCsvUrl } from "@/lib/dms";

export type StockCat = "CAN" | "PET" | "AMDK" | "RGB" | "TETRA" | "RTS" | "LAIN";
export interface StockRow { code: string; name: string; group: string; pack: string; ctn: number; pcs: number; value: number; cat: StockCat; macro: "RTD" | "RTS" }

const GROUP_CAT: [StockCat, string[]][] = [
  ["RTS", ["BOTOL BIRU", "BOTOL HIJAU", "ES TEH POCI", "POCI GOLD", "POCI KUNING", "POCI VANILA", "CELUP BOTOL", "CELUP POCI", "CELUP SOSRO"]],
  ["CAN", ["FRUIT TEA CAN", "TEBS CAN"]],
  ["TETRA", ["COUNTRY CHOICE 1LT", "COUNTRY CHOICE 1 LT", "COUNTRY CHOICE 250", "FRUIT TEA GENGGAM", "S-TEE KTK", "TEH BOTOL KOTAK"]],
  ["PET", ["FRUIT TEA PET K12", "FRUIT TEA PET K24", "JOY TEA 300", "S-TEE", "TEBS PET K12", "TEBS PET K24", "TEH BOTOL PET K12", "TEH BOTOL PET K24"]],
  ["AMDK", ["PRIM-A"]],
  ["RGB", ["BOTOL KACA"]],
];
export function catOfGroup(g: string): StockCat {
  const s = g.toUpperCase().trim();
  for (const [c, keys] of GROUP_CAT) if (keys.some((k) => s === k)) return c;
  // fuzzy fallback: longest contained key
  let best: [StockCat, number] | null = null;
  for (const [c, keys] of GROUP_CAT) for (const k of keys) if (s.includes(k) && (!best || k.length > best[1])) best = [c, k.length];
  return best?.[0] ?? "LAIN";
}

const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^0-9,.-]/g, "");
  if (/,\d{1,2}$/.test(s)) return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, "")) || 0;
  return Number(s.replace(/,/g, "")) || 0;
};
/** "1593.7.0.0" -> 1593 */
const ctnOf = (v: unknown) => (typeof v === "number" ? Math.floor(v) : parseInt(String(v ?? "").trim().split(".")[0]!.replace(/[^0-9-]/g, ""), 10) || 0);

export function parseStockGrid(grid: unknown[][]): StockRow[] {
  const norm = (x: unknown) => String(x ?? "").trim().toUpperCase();
  const hi = grid.findIndex((r) => r.some((c) => norm(c) === "PRODUCT CODE"));
  if (hi < 0) throw new Error('Header "Product Code" tidak ditemukan (baris 7).');
  const H = grid[hi]!.map(norm);
  const col = (n: string) => H.indexOf(n);
  const ig = col("PRODUCT GRUP LEVEL 3"), ic = col("PRODUCT CODE"), iname = col("PRODUCT NAME"), ip = col("PACKAGING"),
    is = col("STOCK"), ipc = col("STOCK (PCS)"), iv = col("VALUE @SELLING");
  const out: StockRow[] = [];
  let group = "";
  for (const r of grid.slice(hi + 1)) {
    const g = String(r[ig] ?? "").trim();
    if (g) group = g;
    const code = String(r[ic] ?? "").trim();
    const G = group.toUpperCase();
    if (!code || !group || G.startsWith("SUBTOTAL") || G === "KEMASAN" || g.toUpperCase().startsWith("SUBTOTAL")) continue;
    const cat = catOfGroup(group);
    out.push({ code, name: String(r[iname] ?? "").trim(), group, pack: String(r[ip] ?? "").trim(), ctn: ctnOf(r[is]), pcs: num(r[ipc]), value: num(r[iv]), cat, macro: cat === "RTS" ? "RTS" : "RTD" });
  }
  return out;
}

export async function loadStock(src: string | File): Promise<StockRow[]> {
  if (typeof src === "string") {
    const res = await fetch(toCsvUrl(src));
    if (!res.ok) throw new Error(`Gagal mengambil sheet stok [${res.status}]`);
    const text = await res.text();
    if (text.trimStart().startsWith("<")) throw new Error('Sheet tidak publik — bagikan ke "Siapa saja yang memiliki link".');
    return parseStockGrid(Papa.parse<string[]>(text, { skipEmptyLines: false }).data);
  }
  if (/\.xlsx?$/i.test(src.name)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await src.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    return parseStockGrid(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "" }));
  }
  return parseStockGrid(Papa.parse<string[]>(await src.text(), { skipEmptyLines: false }).data);
}
