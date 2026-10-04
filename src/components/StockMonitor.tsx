import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, Boxes, ChevronDown, Clock, Package, Search, Truck, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STOCK, STOCK_GROUPS, TARGET_DOI, type StockGroup, type StockItem } from "@/lib/sosro-data";

type Status = "all" | "kritis" | "waspada" | "aman" | "over";
const doiOf = (s: StockItem) => (s.ctn + s.bdp) / s.avg;
const statusOf = (d: number): Exclude<Status, "all"> => (d < 7 ? "kritis" : d < 14 ? "waspada" : d <= 25 ? "aman" : "over");
const STATUS_META = {
  kritis: { label: "Kritis", cls: "bg-danger/15 text-danger font-bold" },
  waspada: { label: "Waspada", cls: "bg-warning/15 text-warning" },
  aman: { label: "Aman", cls: "bg-success/15 text-success" },
  over: { label: "High Stock", cls: "bg-info/15 text-info" },
};
const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const n = (v: number) => Math.round(v).toLocaleString("id-ID");
const reorder = (s: StockItem) => Math.max(0, Math.ceil(s.avg * TARGET_DOI - s.ctn - s.bdp));

export function StockMonitor() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<StockGroup | "All">("All");
  const [status, setStatus] = useState<Status>("all");
  const [closed, setClosed] = useState<string[]>([]);

  const items = useMemo(() => STOCK.filter((s) =>
    (group === "All" || s.group === group) &&
    (status === "all" || statusOf(doiOf(s)) === status) &&
    (s.code + " " + s.name).toLowerCase().includes(q.toLowerCase())), [q, group, status]);

  const onHand = STOCK.reduce((a, s) => a + s.ctn, 0);
  const bdp = STOCK.reduce((a, s) => a + s.bdp, 0);
  const value = STOCK.reduce((a, s) => a + s.ctn * s.price, 0);
  const avgDoi = STOCK.reduce((a, s) => a + doiOf(s), 0) / STOCK.length;
  const critical = STOCK.filter((s) => doiOf(s) < 7).length;

  const kpis = [
    { icon: Boxes, label: "Stock On-Hand", v: `${n(onHand)} CTN` },
    { icon: Truck, label: "In-Transit / BDP", v: `${n(bdp)} CTN` },
    { icon: Wallet, label: "Nilai Inventori", v: `Rp ${(value / 1e9).toFixed(2)} M` },
    { icon: Clock, label: "Rata-rata DOI Depo", v: `${avgDoi.toFixed(1)} Hari` },
    { icon: AlertTriangle, label: "SKU Kritis (DOI < 7)", v: `${critical} SKU`, danger: true },
  ];
  const sumRow = (list: StockItem[]) => ({
    ctn: list.reduce((a, s) => a + s.ctn, 0), bdp: list.reduce((a, s) => a + s.bdp, 0),
    pcs: list.reduce((a, s) => a + s.ctn * s.pcsPerCtn, 0), avg: list.reduce((a, s) => a + s.avg, 0),
    req: list.reduce((a, s) => a + reorder(s), 0), val: list.reduce((a, s) => a + s.ctn * s.price, 0),
  });
  const c = "whitespace-nowrap px-3 py-2.5 text-right tabular-nums";
  const total = sumRow(items);

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <span className="font-display text-4xl font-semibold text-primary"><Package className="h-9 w-9" /></span>
        <div><h2 className="font-display text-xl font-semibold">Monitoring Stok & DOI Depo</h2><p className="text-sm text-muted-foreground">Stock command center · target DOI {TARGET_DOI} hari</p></div>
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
        <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama produk (FTC20, Tebs...)" className="pl-8" /></div>
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...STOCK_GROUPS] as const).map((g) => (
            <button key={g} onClick={() => setGroup(g)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", group === g ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground")}>{g}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([["all", "Semua"], ["kritis", "🚨 Kritis (DOI < 7)"], ["waspada", "⚠️ Waspada (7-14)"], ["aman", "✅ Aman (14-25)"], ["over", "📦 Overstock (> 25)"]] as const).map(([k, l]) => (
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
                {["Harga Dist", "Stock CTN", "BDP", "Stock PCS", "AVG/Hari", "DOI", "Permintaan CTN", "Total Nilai Stok"].map((h) => <th key={h} className={c}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {STOCK_GROUPS.map((g) => {
                const list = items.filter((s) => s.group === g);
                if (!list.length) return null;
                const open = !closed.includes(g), t = sumRow(list);
                return (
                  <Fragment key={g}>
                    <tr className="cursor-pointer bg-surface/70" onClick={() => setClosed(open ? [...closed, g] : closed.filter((x) => x !== g))}>
                      <td colSpan={11} className="px-3 py-2 font-bold uppercase tracking-wider text-primary">
                        <ChevronDown className={cn("mr-1 inline h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />{g} <span className="font-normal text-muted-foreground">· {list.length} SKU</span>
                      </td>
                    </tr>
                    {open && list.map((s) => {
                      const d = doiOf(s), st = STATUS_META[statusOf(d)];
                      return (
                        <tr key={s.code} className="border-t border-border/60 hover:bg-surface/40">
                          <td className="px-3 py-2.5 font-mono font-semibold">{s.code}</td>
                          <td className="whitespace-nowrap px-3">{s.name}</td>
                          <td className="whitespace-nowrap px-3 text-muted-foreground">{s.pack}</td>
                          <td className={c}>{rp(s.price)}</td>
                          <td className={c}>{n(s.ctn)}</td>
                          <td className={cn(c, "bg-warning/10 text-warning")}>{n(s.bdp)}</td>
                          <td className={c}>{n(s.ctn * s.pcsPerCtn)}</td>
                          <td className={c}>{n(s.avg)}</td>
                          <td className={c}><span className={cn("rounded-full px-2 py-0.5", st.cls)}>{d.toFixed(1)} · {st.label}</span></td>
                          <td className={cn(c, reorder(s) > 0 && "font-semibold text-primary")}>{reorder(s) ? n(reorder(s)) : "–"}</td>
                          <td className={c}>{rp(s.ctn * s.price)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-border bg-surface/30 font-semibold">
                      <td colSpan={4} className="px-3 py-2 text-muted-foreground">Subtotal {g}</td>
                      <td className={c}>{n(t.ctn)}</td><td className={cn(c, "bg-warning/10 text-warning")}>{n(t.bdp)}</td><td className={c}>{n(t.pcs)}</td>
                      <td className={c}>{n(t.avg)}</td><td className={c}>{((t.ctn + t.bdp) / t.avg).toFixed(1)}</td><td className={c}>{n(t.req)}</td><td className={c}>{rp(t.val)}</td>
                    </tr>
                  </Fragment>
                );
              })}
              {!items.length && <tr><td colSpan={11} className="py-10 text-center text-muted-foreground">Tidak ada produk yang cocok.</td></tr>}
            </tbody>
            <tfoot className="sticky bottom-0 bg-primary text-primary-foreground">
              <tr className="font-bold">
                <td colSpan={4} className="px-3 py-2.5">GRAND TOTAL</td>
                <td className={c}>{n(total.ctn)}</td><td className={c}>{n(total.bdp)}</td><td className={c}>{n(total.pcs)}</td><td className={c}>{n(total.avg)}</td>
                <td className={c}>{total.avg ? ((total.ctn + total.bdp) / total.avg).toFixed(1) : "–"}</td><td className={c}>{n(total.req)}</td><td className={c}>{rp(total.val)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
