import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity, BarChart3, ChevronDown, Gauge, LayoutDashboard, PieChart as PieIcon, Search, Settings,
  Table2, Target, TrendingDown, TrendingUp, Users, Wallet, Scale, Link2, Warehouse,
} from "lucide-react";
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { StockMonitor } from "@/components/StockMonitor";
import { PACKAGING, type Period, CHANNELS, CLOSED_MONTHS, MONTHS, OUTLETS, REPS, TOTAL_WEIGHT, monthly, type Channel } from "@/lib/sosro-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sosro Distribution Command Center" },
      { name: "description", content: "Executive dashboard for Sosro sales target, realization, gap and brand performance." },
      { property: "og:title", content: "Sosro Distribution Command Center" },
      { property: "og:description", content: "Executive monitoring of target vs realization, growth and brand contribution." },
    ],
  }),
  component: Dashboard,
});

const fmt = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e12) return `${s}Rp ${(a / 1e12).toFixed(2)} T`;
  if (a >= 1e9) return `${s}Rp ${(a / 1e9).toFixed(2)} M`;
  if (a >= 1e6) return `${s}Rp ${Math.round(a / 1e6)} Jt`;
  return `${s}Rp ${a.toLocaleString("id-ID")}`;
};
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
type Cat = "all" | "rtd" | "rts";
const CHART_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-2)", "var(--muted-foreground)"];

function Dashboard() {
  const [selected, setSelected] = useState<string[]>(REPS.map((r) => r.id));
  const [channel, setChannel] = useState<Channel | "All">("All");
  const [cat, setCat] = useState<Cat>("all");
  const [targetAdj, setTargetAdj] = useState(100);
  const [tab, setTab] = useState(0);
  const [view, setView] = useState<"exec" | "stock">("exec");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("ytd");

  const factor = useMemo(() => {
    const w = REPS.filter((r) => selected.includes(r.id) && (channel === "All" || r.channel === channel)).reduce((a, r) => a + r.weight, 0);
    return w / TOTAL_WEIGHT;
  }, [selected, channel]);

  const rows = useMemo(() => monthly.map((m) => {
    const t = cat === "rtd" ? m.rtdTarget : cat === "rts" ? m.rtsTarget : m.rtdTarget + m.rtsTarget;
    const r = cat === "rtd" ? m.rtdReal : cat === "rts" ? m.rtsReal : m.rtdReal + m.rtsReal;
    const target = t * factor * (targetAdj / 100), real = r * factor;
    return { month: m.month, target, real: real || null, ach: real ? +(real / target * 100).toFixed(1) : null };
  }), [factor, cat, targetAdj]);

  const ytd = monthly.slice(0, CLOSED_MONTHS);
  const sum = (k: keyof (typeof monthly)[0]) => ytd.reduce((a, m) => a + (m[k] as number), 0) * factor;
  const real = sum("rtdReal") + sum("rtsReal");
  const target = (sum("rtdTarget") + sum("rtsTarget")) * (targetAdj / 100);
  const ly = sum("rtdLY") + sum("rtsLY");
  const gap = real - target, growth = ly ? real / ly - 1 : 0;
  const rtdShare = real ? sum("rtdReal") / real : 0;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-20 flex-col items-center gap-3 border-r border-sidebar-border bg-sidebar py-6 md:flex">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground glow-primary"><Activity className="h-5 w-5" /></div>
        {([["exec", LayoutDashboard, "Executive Dashboard"], ["stock", Warehouse, "Monitoring Stok & DOI Depo"]] as const).map(([v, I, l]) => (
          <button key={v} onClick={() => setView(v)} aria-label={l} title={l}
            className={cn("grid h-11 w-11 place-items-center rounded-2xl transition-colors", view === v ? "bg-sidebar-accent text-primary" : "text-muted-foreground hover:text-foreground")}>
            <I className="h-5 w-5" />
          </button>
        ))}
        <button onClick={() => setSettingsOpen(true)} aria-label="Data & Target Settings" title="Data & Target Settings" className="grid h-11 w-11 place-items-center rounded-2xl text-muted-foreground hover:text-foreground"><Settings className="h-5 w-5" /></button>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 lg:px-8">
            <div className="mr-auto">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Executive Monitoring</p>
              <h1 className="font-display text-xl font-semibold lg:text-2xl">Sosro Distribution <span className="text-primary">Command Center</span></h1>
            </div>
            <div className="flex rounded-full border border-border bg-card p-1">
              {(["All", ...CHANNELS] as const).map((c) => (
                <button key={c} onClick={() => setChannel(c)}
                  className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", channel === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{c}</button>
              ))}
            </div>
            <RepPicker selected={selected} setSelected={setSelected} />
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} targetAdj={targetAdj} setTargetAdj={setTargetAdj} />
          </div>
          <div className="flex flex-wrap gap-1 px-5 pb-3 lg:px-8">
            <button onClick={() => setView(view === "exec" ? "stock" : "exec")} className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground md:hidden">{view === "exec" ? "→ Stok & DOI" : "→ Dashboard"}</button>
            {view === "exec" && ["Performance", "Brand & Packaging", "Pareto"].map((t, i) => (
              <button key={t} onClick={() => setTab(i)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === i ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>{t}</button>
            ))}
          </div>
        </header>

        <main className="space-y-6 p-5 lg:p-8">
          {view === "stock" && <StockMonitor />}
          {view === "exec" && tab === 0 && (
            <>
              <SectionTitle n="01" title="Executive Performance & Gap Monitoring" sub={`YTD Jan – ${MONTHS[CLOSED_MONTHS - 1]} 2026`} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="glass-card relative overflow-hidden p-5 glow-primary">
                  <CardHead icon={Target} label="Realisasi vs Target" />
                  <p className="mt-4 whitespace-nowrap font-display text-3xl font-semibold">{fmt(real)}</p>
                  <p className="whitespace-nowrap text-sm text-muted-foreground">dari {fmt(target)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (real / target) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-primary">{pct(real / target)} Ach</p>
                </div>
                <div className="glass-card p-5">
                  <CardHead icon={Wallet} label="Net Gap Value" />
                  <p className={cn("mt-4 whitespace-nowrap font-display text-3xl font-semibold", gap < 0 ? "text-danger" : "text-success")}>{fmt(gap)}</p>
                  <span className={cn("mt-3 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", gap < 0 ? "bg-danger/15 text-danger" : "bg-success/15 text-success")}>
                    {gap < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}{gap < 0 ? "Defisit" : "Surplus"}
                  </span>
                </div>
                <div className="glass-card p-5">
                  <CardHead icon={TrendingUp} label="Growth YoY" />
                  <p className={cn("mt-4 font-display text-3xl font-semibold", growth < 0 ? "text-danger" : "text-success")}>{growth >= 0 ? "+" : ""}{pct(growth)}</p>
                  <p className="mt-1 whitespace-nowrap text-sm text-muted-foreground">2026 vs 2025 · {fmt(ly)} LY</p>
                </div>
                <div className="glass-card p-5">
                  <CardHead icon={Scale} label="RTD vs RTS Share" />
                  <div className="mt-4 flex items-end justify-between font-display">
                    <span className="text-3xl font-semibold text-primary">{Math.round(rtdShare * 100)}%</span>
                    <span className="text-xl font-semibold text-chart-3">{100 - Math.round(rtdShare * 100)}%</span>
                  </div>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full">
                    <div className="bg-primary" style={{ width: `${rtdShare * 100}%` }} /><div className="flex-1 bg-chart-3" />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>RTD</span><span>RTS</span></div>
                </div>
              </div>

              <div className="glass-card p-5 hover:translate-y-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <CardHead icon={BarChart3} label="Monthly Performance · Target vs Realisasi" />
                  <div className="flex rounded-full bg-surface p-1">
                    {([["all", "Semua Kategori"], ["rtd", "RTD Only"], ["rts", "RTS Only"]] as const).map(([k, l]) => (
                      <button key={k} onClick={() => setCat(k)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", cat === k ? "bg-foreground text-background" : "text-muted-foreground")}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rows} margin={{ left: 0, right: 0, top: 10 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis yAxisId="v" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${Math.round(v / 1e6)}`} width={40} />
                      <YAxis yAxisId="p" orientation="right" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={11} unit="%" width={44} domain={[0, 130]} />
                      <Tooltip cursor={{ fill: "var(--surface)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
                        formatter={(v: number, n: string) => (n === "% Ach" ? `${v}%` : fmt(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="v" dataKey="target" name="Target" fill="var(--chart-2)" radius={[6, 6, 0, 0]} maxBarSize={22} />
                      <Bar yAxisId="v" dataKey="real" name="Realisasi" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={22} />
                      <Line yAxisId="p" dataKey="ach" name="% Ach" stroke="var(--chart-4)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--chart-4)" }} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <Accordion type="single" collapsible className="glass-card px-5 hover:translate-y-0">
                <AccordionItem value="t" className="border-0">
                  <AccordionTrigger className="hover:no-underline"><span className="flex items-center gap-2 font-semibold"><Table2 className="h-4 w-4 text-primary" />Lihat Tabel Data Rinci (RTD & RTS)</span></AccordionTrigger>
                  <AccordionContent><DetailTable factor={factor} adj={targetAdj / 100} /></AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}

          {view === "exec" && tab === 1 && <BrandSlide period={period} setPeriod={setPeriod} factor={factor} />}

          {view === "exec" && tab === 2 && (
            <>
              <SectionTitle n="03" title="Top 15 Pareto Outlet" sub="Kontribusi kumulatif terhadap total realisasi" />
              <div className="glass-card overflow-x-auto p-5 hover:translate-y-0">
                <ParetoTable factor={factor} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="flex items-end gap-4">
      <span className="font-display text-4xl font-semibold text-primary">{n}</span>
      <div><h2 className="font-display text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{sub}</p></div>
    </div>
  );
}

function CardHead({ icon: I, label }: { icon: typeof Target; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-surface text-primary"><I className="h-4 w-4" /></span>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function RepPicker({ selected, setSelected }: { selected: string[]; setSelected: (s: string[]) => void }) {
  const [q, setQ] = useState("");
  const all = selected.length === REPS.length;
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <Popover>
      <PopoverTrigger className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/50">
        <Users className="h-4 w-4 text-primary" />Salesman
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{selected.length}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border p-3">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari salesman..." className="pl-8" /></div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <Checkbox checked={all} onCheckedChange={() => setSelected(all ? [] : REPS.map((r) => r.id))} />Pilih Semua
          </label>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {CHANNELS.map((c) => {
            const list = REPS.filter((r) => r.channel === c && r.name.toLowerCase().includes(q.toLowerCase()));
            if (!list.length) return null;
            return (
              <div key={c} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">{c}</p>
                {list.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                    <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} />{r.name}
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SettingsModal({ open, setOpen, targetAdj, setTargetAdj }: { open: boolean; setOpen: (b: boolean) => void; targetAdj: number; setTargetAdj: (n: number) => void }) {
  const slots = ["Data Tahunan / 2025 Baseline", "Data Realisasi Bulan Berjalan 2026", "Target 2026 (RTD vs RTS)", "Data Monitoring Stok & DOI Depo"];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground glow-primary">
        <Settings className="h-4 w-4" />Data & Target
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Data & Target Settings</DialogTitle><DialogDescription>Sinkronisasi Google Sheets dan input target manual.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {slots.map((l, i) => (
            <div key={l} className="space-y-2 rounded-xl border border-border bg-surface/50 p-3">
              <Label className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>{l}</Label>
              <div className="relative"><Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="https://docs.google.com/spreadsheets/..." /></div>
              {i === 2 && (<div className="space-y-1"><Label className="text-xs text-muted-foreground">Input manual · Penyesuaian Target (%)</Label>
                <Input type="number" value={targetAdj} onChange={(e) => setTargetAdj(Math.max(1, Number(e.target.value) || 100))} /></div>)}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BrandSlide({ period, setPeriod, factor }: { period: Period; setPeriod: (p: Period) => void; factor: number }) {
  const rows = PACKAGING.map((p) => {
    const vol = (period === "mtd" ? p.mtdVol : p.ytdVol) * factor;
    const val = (period === "mtd" ? p.mtdVal : p.ytdVal) * factor;
    const gwt = period === "mtd" ? p.mtdVal / p.lyMtdVal - 1 : p.ytdVal / p.lyYtdVal - 1;
    return { ...p, vol, val, gwt };
  });
  const total = rows.reduce((a, r) => a + r.val, 0);
  const totalVol = rows.reduce((a, r) => a + r.vol, 0);
  const lyTotal = PACKAGING.reduce((a, p) => a + (period === "mtd" ? p.lyMtdVal : p.lyYtdVal), 0) * factor;
  const pie = rows.map((r) => ({ name: r.cat, value: period === "yoy" ? Math.max(0, +(r.gwt * 100).toFixed(1)) || 0.1 : +(r.val / total * 100).toFixed(1) }));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle n="02" title="Brand & Packaging Distribution Analysis" sub={period === "mtd" ? `Bulan Berjalan · ${MONTHS[CLOSED_MONTHS - 1]} 2026` : period === "ytd" ? `YTD Jan – ${MONTHS[CLOSED_MONTHS - 1]} 2026` : "Pertumbuhan YTD 2026 vs 2025"} />
        <div className="flex rounded-full border border-border bg-card p-1">
          {([["mtd", "Bulan Berjalan / MTD"], ["ytd", "YTD"], ["yoy", "YoY Growth (% GWT)"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold", period === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass-card p-5 lg:col-span-2 hover:translate-y-0">
          <CardHead icon={PieIcon} label={period === "yoy" ? "Kontribusi Growth Positif" : "Share Nilai per Kemasan"} />
          <div className="relative h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="88%" paddingAngle={3} stroke="none">
                  {pie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div><p className="text-xs text-muted-foreground">{period === "yoy" ? "GWT Total" : "Total Omset"}</p>
                <p className="font-display text-lg font-semibold">{period === "yoy" ? `${total / lyTotal - 1 >= 0 ? "+" : ""}${pct(total / lyTotal - 1)}` : fmt(total)}</p></div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs">{pie.map((p, i) => <span key={p.name} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />{p.name}</span>)}</div>
        </div>
        <div className="glass-card overflow-x-auto p-5 lg:col-span-3 hover:translate-y-0">
          <CardHead icon={Gauge} label="Brand & Packaging Breakdown" />
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b border-border">
              <th className="py-2 text-left">Kategori / Kemasan</th><th className="text-right">Volume (Krat/CTN)</th><th className="text-right">Omset (IDR)</th><th className="text-right">Kontribusi</th><th className="text-right">% GWT</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.cat} className="border-b border-border/60">
                  <td className="py-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} /><div><p className="font-semibold">{r.cat}</p><p className="text-xs text-muted-foreground">{r.brand}</p></div></div></td>
                  <td className="whitespace-nowrap text-right tabular-nums">{Math.round(r.vol).toLocaleString("id-ID")}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.val)}</td>
                  <td className="text-right tabular-nums">{pct(r.val / total)}</td>
                  <td className="text-right"><span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", r.gwt >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>{r.gwt >= 0 ? "+" : ""}{pct(r.gwt)}</span></td>
                </tr>
              ))}
              <tr className="font-bold"><td className="py-3">TOTAL</td><td className="text-right tabular-nums">{Math.round(totalVol).toLocaleString("id-ID")}</td><td className="whitespace-nowrap text-right tabular-nums">{fmt(total)}</td><td className="text-right">100%</td>
                <td className="text-right"><span className={cn("rounded-full px-2 py-0.5 text-xs", total >= lyTotal ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>{total >= lyTotal ? "+" : ""}{pct(total / lyTotal - 1)}</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function DetailTable({ factor, adj }: { factor: number; adj: number }) {
  const cell = "whitespace-nowrap px-3 py-2 text-right tabular-nums";
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead className="bg-surface text-muted-foreground">
          <tr><th className="px-3 py-2 text-left">Bulan</th>
            {["Target RTD", "Real RTD", "Ach RTD", "Target RTS", "Real RTS", "Ach RTS", "Gap Total"].map((h) => <th key={h} className={cell}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {monthly.map((m) => {
            const tR = m.rtdTarget * factor * adj, rR = m.rtdReal * factor, tS = m.rtsTarget * factor * adj, rS = m.rtsReal * factor;
            const g = rR + rS - tR - tS, open = !m.rtdReal;
            return (
              <tr key={m.month} className="border-t border-border hover:bg-surface/50">
                <td className="px-3 py-2 font-semibold">{m.month}</td>
                <td className={cell}>{fmt(tR)}</td><td className={cell}>{open ? "–" : fmt(rR)}</td>
                <td className={cn(cell, !open && (rR >= tR ? "text-success" : "text-danger"))}>{open ? "–" : pct(rR / tR)}</td>
                <td className={cell}>{fmt(tS)}</td><td className={cell}>{open ? "–" : fmt(rS)}</td>
                <td className={cn(cell, !open && (rS >= tS ? "text-success" : "text-danger"))}>{open ? "–" : pct(rS / tS)}</td>
                <td className={cn(cell, "font-semibold", !open && (g >= 0 ? "text-success" : "text-danger"))}>{open ? "–" : fmt(g)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ParetoTable({ factor }: { factor: number }) {
  const total = OUTLETS.reduce((a, o) => a + o.value, 0) / 0.62;
  let cum = 0;
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground">
        <tr className="border-b border-border"><th className="py-2 text-left">#</th><th className="text-left">Outlet</th><th className="text-left">Channel</th><th className="text-right">Realisasi</th><th className="text-right">Share</th><th className="w-48 pl-6 text-left">Kumulatif</th></tr>
      </thead>
      <tbody>
        {OUTLETS.map((o, i) => {
          const s = o.value / total; cum += s;
          return (
            <tr key={o.name} className="border-b border-border/60 hover:bg-surface/50">
              <td className="py-2.5 font-display font-semibold text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
              <td className="whitespace-nowrap font-medium">{o.name}</td>
              <td><span className="rounded-full bg-surface px-2 py-0.5 text-xs">{o.channel}</span></td>
              <td className="whitespace-nowrap text-right tabular-nums">{fmt(o.value * factor)}</td>
              <td className="text-right tabular-nums">{pct(s)}</td>
              <td className="pl-6"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-surface"><div className="h-full rounded-full bg-primary" style={{ width: `${cum * 100}%` }} /></div><span className="w-12 text-right text-xs tabular-nums">{pct(cum)}</span></div></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
