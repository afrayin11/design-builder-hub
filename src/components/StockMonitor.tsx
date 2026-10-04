import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, ChevronDown, Clock, Package, Search, Truck, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STOCK, TARGET_DOI } from "@/lib/sosro-data";
import { catOfGroup, type StockRow } from "@/lib/stock";
import type { DmsRow } from "@/lib/dms";

type Status = "all" | "kritis" | "waspada" | "aman" | "over";
const statusOf = (d: number): Exclude<Status, "all"> => (d < 15 ? "kritis" : d <= 30 ? "waspada" : d <= 59 ? "aman" : "over");
const STATUS_META = {
  kritis: { label: "🚨 Kritis", cls: "bg-danger/15 text-danger font-bold" },
  waspada: { label: "⚠️ Waspada", cls: "bg-warning/15 text-warning" },
  aman: { label: "✅ Aman", cls: "bg-success/15 text-success" },
  over: { label: "📦 Overstock", cls: "bg-chart-5/15 text-chart-5" },
};
const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const n = (v: number) => Math.round(v).toLocaleString("id-ID");
const n1 = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 1 });

// Mock fallback converted to the DMS stock shape
const MOCK: StockRow[] = STOCK.map((s) => {
  const cat = s.group === "RTS" ? "RTS" : catOfGroup(s.group);
  return { code: s.code, name: s.name, group: s.group, pack: s.pack, ctn: s.ctn, pcs: 0, value: s.ctn * s.price, cat: cat === "LAIN" ? "PET" : cat, macro: s.group === "RTS" ? "RTS" : "RTD" };
});
const MOCK_AVG = Object.fromEntries(STOCK.map((s) => [s.code, { a3: s.avg, a6: s.avg * 0.93 }]));
const MOCK_BDP = Object.fromEntries(STOCK.map((s) => [s.code, s.bdp]));

export function StockMonitor({ cutoffLabel, stock, dms }: { cutoffLabel: string; stock: StockRow[] | null; dms: DmsRow[] | null }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("All");
  const [status, setStatus] = useState<Status>("all");
  const [macro, setMacro] = useState<"all" | "RTD" | "RTS">("all");
  const [basis, setBasis] = useState<"a3" | "a6">("a3");
  const [closed, setClosed] = useState<string[]>([]);
  const [bdp, setBdp] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { const d = JSON.parse(localStorage.getItem("sosro-bdp") || "null"); setBdp(d ?? MOCK_BDP); } catch { setBdp(MOCK_BDP); }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem("sosro-bdp", JSON.stringify(bdp)); }, [bdp, loaded]);

  const rows = stock ?? MOCK;
  // Daily demand per SKU from sales transactions (last 90 / 180 days before latest transaction)
  const avgMap = useMemo(() => {
    if (!dms) return MOCK_AVG;
    const t = (r: DmsRow) => Date.UTC(r.y, r.m - 1, r.d);
    let last = 0;
    for (const r of dms) if (r.sale) last = Math.max(last, t(r));
    const D = 86400000, m: Record<string, { a3: number; a6: number }> = {};
    for (const r of dms) {
      if (!r.sale || !r.code) continue;
      const age = (last - t(r)) / D;
      if (age < 0 || age >= 180) continue;
      const o = (m[r.code] ??= { a3: 0, a6: 0 });
      o.a6 += r.ctn / 180; if (age < 90) o.a3 += r.ctn / 90;
    }
    return m;
  }, [dms]);

  const calc = useMemo(() => rows.map((s) => {
    const avg = avgMap[s.code]?.[basis] ?? 0, b = bdp[s.code] ?? 0, eff = s.ctn + b;
    const doi = avg ? eff / avg : eff ? Infinity : 0;
    const req = avg ? Math.max(0, Math.round((TARGET_DOI - doi) * avg)) : 0;
    return { ...s, avg, b, eff, doi, req };
  }), [rows, avgMap, basis, bdp]);
  type C = (typeof calc)[number];

  const scoped = calc.filter((s) => macro === "all" || s.macro === macro);
  const groups = [...new Set(scoped.map((s) => s.group))];
  const items = scoped.filter((s) =>
    (group === "All" || s.group === group) &&
    (status === "all" || statusOf(s.doi) === status) &&
    (s.code + " " + s.name).toLowerCase().includes(q.toLowerCase()));

  const sumRow = (list: C[]) => ({
    ctn: list.reduce((a, s) => a + s.ctn, 0), bdp: list.reduce((a, s) => a + s.b, 0),
    pcs: list.reduce((a, s) => a + s.pcs, 0), avg: list.reduce((a, s) => a + s.avg, 0),
    req: list.reduce((a, s) => a + s.req, 0), val: list.reduce((a, s) => a + s.value, 0),
  });
  const K = sumRow(scoped);
  const withAvg = scoped.filter((s) => s.avg > 0);
  const avgDoi = withAvg.length ? withAvg.reduce((a, s) => a + s.doi, 0) / withAvg.length : 0;
  const critical = scoped.filter((s) => s.avg > 0 && s.doi < 15).length;
  const kpis = [
    { icon: Boxes, label: "Stock On-Hand", v: `${n(K.ctn)} CTN` },
    { icon: Truck, label: "In-Transit / BDP", v: `${n(K.bdp)} CTN` },
    { icon: Wallet, label: "Nilai Inventori", v: `Rp ${(K.val / 1e9).toFixed(2)} M` },
    { icon: Clock, label: "Rata-rata DOI Depo", v: `${avgDoi.toFixed(1)} Hari` },
    { icon: AlertTriangle, label: "SKU Kritis (DOI < 15)", v: `${critical} SKU`, danger: true },
  ];
  const c = "whitespace-nowrap px-3 py-2.5 text-right tabular-nums";
  const total = sumRow(items);
  const doiTxt = (d: number) => (Number.isFinite(d) ? d.toFixed(1) : "∞");
  const pill = (on: boolean) => cn("rounded-full px-3 py-1.5 text-xs font-semibold", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground");

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <span className="font-display text-4xl font-semibold text-primary"><Package className="h-9 w-9" /></span>
        <div><h2 className="font-display text-xl font-semibold">Monitoring Stok & DOI Depo</h2><p className="text-sm text-muted-foreground">Posisi Stok per Tanggal: <span className="font-semibold text-primary">{cutoffLabel}</span> · target DOI {TARGET_DOI} hari · {stock ? `File stok DMS (${stock.length} SKU)` : "Data contoh"} · AVG {dms ? "dari transaksi DMS" : "contoh"}</p></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className={cn("glass-card p-5", k.danger && critical > 0 && "border-danger/40")}>
            <div className="flex items-center gap-2.5">
              <span className={cn("grid h-8 w-8 place-items-center rounded-xl bg-surface", k.danger ? "text-danger" : "text-primary")}><k.icon className="h-4 w-4" /></span>
              <span className="text-sm font-medium text-muted-foreground">{k.label}</span>
            </div>
            <p className={cn("mt-4 whitespace-nowrap font-display text-2xl font-semibold", k.danger && critical > 0 && "text-danger")}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className="glass-card space-y-3 p-5 hover:translate-y-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama produk (FTC20, Tebs...)" className="pl-8" /></div>
          <div className="flex rounded-full border border-border bg-card p-1">
            {([["all", "Semua Kategori"], ["RTD", "Hanya RTD"], ["RTS", "Hanya RTS"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setMacro(k); setGroup("All"); }} className={pill(macro === k)}>{l}</button>
            ))}
          </div>
          <div className="flex rounded-full border border-border bg-card p-1">
            {([["a3", "Basis Demand: AVG 3 Bulan"], ["a6", "Basis Demand: AVG 6 Bulan"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setBasis(k)} className={pill(basis === k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", ...groups].map((g) => (
            <button key={g} onClick={() => setGroup(g)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", group === g ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground")}>{g}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([["all", "Semua"], ["kritis", "🚨 Kritis (DOI < 15)"], ["waspada", "⚠️ Waspada (15-30)"], ["aman", "✅ Aman (31-59)"], ["over", "📦 Overstock (> 59)"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", status === k ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden hover:translate-y-0">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-card text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left">Kode</th><th className="px-3 text-left">Nama Produk</th><th className="px-3 text-left">Kemasan</th>
                {["Harga / CTN", "Stock CTN", "BDP (edit)", "Stock PCS", "Stok Efektif", `AVG/Hari (${basis === "a3" ? "3M" : "6M"})`, "DOI", "Permintaan CTN", "Total Nilai Stok"].map((h) => <th key={h} className={c}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const list = items.filter((s) => s.group === g);
                if (!list.length) return null;
                const open = !closed.includes(g), t = sumRow(list);
                return (
                  <Fragment key={g}>
                    <tr className="cursor-pointer bg-surface/70" onClick={() => setClosed(open ? [...closed, g] : closed.filter((x) => x !== g))}>
                      <td colSpan={12} className="px-3 py-2 font-bold uppercase tracking-wider text-primary">
                        <ChevronDown className={cn("mr-1 inline h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />{g} <span className="font-normal text-muted-foreground">· {list[0]!.macro} · {list[0]!.cat} · {list.length} SKU</span>
                      </td>
                    </tr>
                    {open && list.map((s) => {
                      const st = s.avg ? STATUS_META[statusOf(s.doi)] : null;
                      return (
                        <tr key={s.code} className="border-t border-border/60 hover:bg-surface/40">
                          <td className="px-3 py-2.5 font-mono font-semibold">{s.code}</td>
                          <td className="whitespace-nowrap px-3">{s.name}</td>
                          <td className="whitespace-nowrap px-3 text-muted-foreground">{s.pack}</td>
                          <td className={c}>{s.ctn ? rp(s.value / s.ctn) : "–"}</td>
                          <td className={c}>{n(s.ctn)}</td>
                          <td className="bg-warning/10 px-1.5 py-1">
                            <input aria-label={`BDP ${s.code}`} inputMode="numeric" value={s.b ? s.b.toLocaleString("id-ID") : ""} placeholder="0"
                              onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9]/g, "")) || 0; setBdp((p) => ({ ...p, [s.code]: v })); }}
                              className="w-20 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-right tabular-nums text-warning outline-none placeholder:text-warning/40 focus:border-warning" />
                          </td>
                          <td className={c}>{n(s.pcs)}</td>
                          <td className={cn(c, "font-semibold")}>{n(s.eff)}</td>
                          <td className={c}>{n1(s.avg)}</td>
                          <td className={c}>{st ? <span className={cn("rounded-full px-2 py-0.5", st.cls)}>{doiTxt(s.doi)} · {st.label}</span> : <span className="text-muted-foreground">tidak ada penjualan</span>}</td>
                          <td className={cn(c, s.req > 0 && "font-semibold text-primary")}>{s.req ? n(s.req) : "–"}</td>
                          <td className={c}>{rp(s.value)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-border bg-surface/30 font-semibold">
                      <td colSpan={4} className="px-3 py-2 text-muted-foreground">Subtotal {g}</td>
                      <td className={c}>{n(t.ctn)}</td><td className={cn(c, "bg-warning/10 text-warning")}>{n(t.bdp)}</td><td className={c}>{n(t.pcs)}</td><td className={c}>{n(t.ctn + t.bdp)}</td>
                      <td className={c}>{n1(t.avg)}</td><td className={c}>{t.avg ? ((t.ctn + t.bdp) / t.avg).toFixed(1) : "–"}</td><td className={c}>{n(t.req)}</td><td className={c}>{rp(t.val)}</td>
                    </tr>
                  </Fragment>
                );
              })}
              {!items.length && <tr><td colSpan={12} className="py-10 text-center text-muted-foreground">Tidak ada produk yang cocok.</td></tr>}
            </tbody>
            <tfoot className="sticky bottom-0 bg-primary text-primary-foreground">
              <tr className="font-bold">
                <td colSpan={4} className="px-3 py-2.5">GRAND TOTAL</td>
                <td className={c}>{n(total.ctn)}</td><td className={c}>{n(total.bdp)}</td><td className={c}>{n(total.pcs)}</td><td className={c}>{n(total.ctn + total.bdp)}</td><td className={c}>{n1(total.avg)}</td>
                <td className={c}>{total.avg ? ((total.ctn + total.bdp) / total.avg).toFixed(1) : "–"}</td><td className={c}>{n(total.req)}</td><td className={c}>{rp(total.val)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
