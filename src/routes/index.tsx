import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Activity, BarChart3, ChevronDown, Gauge, LayoutDashboard, PieChart as PieIcon, Search, Settings,
  Table2, Target, CalendarDays, TrendingDown, TrendingUp, Users, Wallet, Scale, Link2, Warehouse,
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
import { PACKAGING, type Period, CHANNELS, CLOSED_MONTHS, MONTHS, MONTHS_ID, YEARS, JUTA, CATEGORY_MAP, type PackCat, OUTLETS, REPS, TOTAL_WEIGHT, monthly, type Channel, type Rep } from "@/lib/sosro-data";
import { fetchDms, parseDms, type DmsRow } from "@/lib/dms";
type PackRow = (typeof PACKAGING)[number];
type Outlet = { name: string; channel?: string | undefined; value: number };

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
const rpFull = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`;
const cleanNum = (s: string) => Number(s.replace(/[^0-9-]/g, "")) || 0;
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
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9);
  const [cutoff, setCutoff] = useState<"full" | "daily">("daily");
  const [today, setToday] = useState(4);
  const [targetMode, setTargetMode] = useState<"link" | "manual">("manual");
  const [targets, setTargets] = useState(() => monthly.map((m) => ({ rtd: m.rtdTarget, rts: m.rtsTarget })));
  const [loaded, setLoaded] = useState(false);
  const [sheets, setSheets] = useState<string[]>(["", "", "", ""]);
  const [dmsParts, setDmsParts] = useState<(DmsRow[] | null)[]>([null, null]);
  const [syncMsg, setSyncMsg] = useState<string[]>(["", ""]);
  const dms = useMemo(() => (dmsParts[0] || dmsParts[1] ? [...(dmsParts[0] ?? []), ...(dmsParts[1] ?? [])] : null), [dmsParts]);
  const reps = useMemo<Rep[]>(() => {
    if (!dms) return REPS;
    const extra = new Map<string, Rep>();
    for (const r of dms) if (!REPS.some((x) => x.id === r.sales) && !extra.has(r.sales) && r.sales)
      extra.set(r.sales, { id: r.sales, name: r.sales.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()), channel: r.ch, badge: r.ch, weight: 1 });
    return [...REPS, ...extra.values()];
  }, [dms]);
  const loadSheet = async (i: number, src: string | File) => {
    setSyncMsg((s) => s.map((x, j) => (j === i ? "Sinkronisasi..." : x)));
    try {
      const rows = typeof src === "string" ? await fetchDms(src) : await parseDms(src);
      setDmsParts((p) => p.map((x, j) => (j === i ? rows : x)));
      setSyncMsg((s) => s.map((x, j) => (j === i ? `✓ ${rows.length.toLocaleString("id-ID")} baris dimuat` : x)));
    } catch (e) {
      setSyncMsg((s) => s.map((x, j) => (j === i ? `✗ ${(e as Error).message}` : x)));
    }
  };

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("sosro-settings") || "{}");
      if (Array.isArray(d.selected)) { const ok = d.selected.filter((s: string) => REPS.some((r) => r.id === s)); if (ok.length) setSelected(ok); }
      if (d.targetAdj) setTargetAdj(d.targetAdj);
      if (d.v === 2) { if (d.year) setYear(d.year); if (d.month != null) setMonth(d.month); if (d.cutoff) setCutoff(d.cutoff); if (d.today) setToday(d.today); }
      if (d.targets?.length === 12) setTargets(d.targets.map((t: { rtd: number; rts: number }) => (t.rtd < 1e6 ? { rtd: t.rtd * JUTA, rts: t.rts * JUTA } : t))); if (d.targetMode) setTargetMode(d.targetMode);
      if (Array.isArray(d.sheets)) { setSheets(d.sheets); d.sheets.slice(0, 2).forEach((u: string, i: number) => u && loadSheet(i, u)); }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("sosro-settings", JSON.stringify({ v: 2, today, selected, targetAdj, year, month, cutoff, targets, targetMode, sheets }));
  }, [loaded, selected, targetAdj, year, month, cutoff, targets, targetMode, today, sheets]);

  const pickChannel = (c: Channel | "All") => { setChannel(c); setSelected(reps.filter((r) => c === "All" || r.channel === c).map((r) => r.id)); };

  const days = new Date(year, month + 1, 0).getDate();
  const cutDay = cutoff === "full" ? days : Math.min(today, days);
  const frac = cutDay / days;
  const cutLabel = `${cutDay} ${MONTHS[month]} ${year}`;

  // Real DMS aggregation pipeline (null = fall back to mock data)
  const agg = useMemo(() => {
    if (!dms) return null;
    const sel = new Set(selected);
    const f = dms.filter((r) => sel.has(r.sales) && (channel === "All" || r.ch === channel));
    const M = Array.from({ length: 12 }, () => ({ rtdR: 0, rtsR: 0, rtdLY: 0, rtsLY: 0 }));
    const cats = Object.keys(CATEGORY_MAP) as PackCat[];
    const P = Object.fromEntries(cats.map((c) => [c, { cat: c, brand: CATEGORY_MAP[c].join(" / "), mtdVol: 0, mtdVal: 0, ytdVol: 0, ytdVal: 0, lyYtdVal: 0, lyMtdVal: 0 }])) as Record<PackCat, PackRow>;
    const cust = new Map<string, Outlet>();
    let ytdTotal = 0;
    for (const r of f) {
      const i = r.m - 1;
      if (i < 0 || i > month || (i === month && r.d > cutDay)) continue;
      const cur = r.y === year, ly = r.y === year - 1;
      if (!cur && !ly) continue;
      const m = M[i]!;
      if (cur) { if (r.rts) m.rtsR += r.amt; else m.rtdR += r.amt; } else { if (r.rts) m.rtsLY += r.amt; else m.rtdLY += r.amt; }
      const p = r.cat ? P[r.cat] : null;
      if (p) {
        if (cur) { p.ytdVal += r.amt; p.ytdVol += r.ctn; if (i === month) { p.mtdVal += r.amt; p.mtdVol += r.ctn; } }
        else { p.lyYtdVal += r.amt; if (i === month) p.lyMtdVal += r.amt; }
      }
      if (cur) {
        ytdTotal += r.amt;
        const o = cust.get(r.cust) ?? { name: r.cust, channel: r.ch, value: 0 };
        o.value += r.amt; cust.set(r.cust, o);
      }
    }
    const outlets = [...cust.values()].sort((a, b) => b.value - a.value).slice(0, 15);
    return { M, pack: cats.map((c) => P[c]), outlets, ytdTotal };
  }, [dms, selected, channel, year, month, cutDay]);

  const yd = useMemo(() => monthly.map((m, i) => {
    const a = agg?.M[i];
    const base = year === 2026
      ? { rtdT: targets[i]!.rtd, rtsT: targets[i]!.rts, rtdR: a ? a.rtdR : m.rtdReal, rtsR: a ? a.rtsR : m.rtsReal, rtdLY: a ? a.rtdLY : m.rtdLY, rtsLY: a ? a.rtsLY : m.rtsLY }
      : a ? { rtdT: a.rtdLY * 1.05, rtsT: a.rtsLY * 1.05, rtdR: a.rtdR, rtsR: a.rtsR, rtdLY: a.rtdLY, rtsLY: a.rtsLY }
      : { rtdT: m.rtdLY * 1.05, rtsT: m.rtsLY * 1.05, rtdR: m.rtdLY, rtsR: m.rtsLY, rtdLY: m.rtdLY * 0.92, rtsLY: m.rtsLY * 0.92 };
    if (i > month) return { ...base, rtdR: 0, rtsR: 0 };
    if (i === month && frac < 1) {
      if (a) return { ...base, rtdT: base.rtdT * frac, rtsT: base.rtsT * frac };
      return { rtdT: base.rtdT * frac, rtsT: base.rtsT * frac, rtdR: base.rtdR * frac, rtsR: base.rtsR * frac, rtdLY: base.rtdLY * frac, rtsLY: base.rtsLY * frac };
    }
    return base;
  }), [year, month, frac, targets, agg]);

  const factor = useMemo(() => {
    if (agg) return 1;
    const w = REPS.filter((r) => selected.includes(r.id) && (channel === "All" || r.channel === channel)).reduce((a, r) => a + r.weight, 0);
    return w / TOTAL_WEIGHT;
  }, [selected, channel, agg]);

  const rows = useMemo(() => monthly.map((m) => {
    const d = yd[monthly.indexOf(m)]!;
    const t = cat === "rtd" ? d.rtdT : cat === "rts" ? d.rtsT : d.rtdT + d.rtsT;
    const r = cat === "rtd" ? d.rtdR : cat === "rts" ? d.rtsR : d.rtdR + d.rtsR;
    const target = t * factor * (targetAdj / 100), real = r * factor;
    return { month: m.month, target, real: real || null, ach: real && target ? +(real / target * 100).toFixed(1) : null };
  }), [factor, cat, targetAdj, yd]);

  const cm = yd[month]!;
  const real = (cm.rtdR + cm.rtsR) * factor;
  const target = (cm.rtdT + cm.rtsT) * factor * (targetAdj / 100) || 1;
  const ly = (cm.rtdLY + cm.rtsLY) * factor;
  const gap = real - target, growth = ly ? real / ly - 1 : 0;
  const rtdShare = real ? cm.rtdR * factor / real : 0;
  // scaling vs reference (Jul 2026 MTD / YTD) for brand & pareto mock data
  const refM = monthly[CLOSED_MONTHS - 1]!.rtdReal + monthly[CLOSED_MONTHS - 1]!.rtsReal;
  const refY = monthly.slice(0, CLOSED_MONTHS).reduce((a, m) => a + m.rtdReal + m.rtsReal, 0);
  const mScale = (cm.rtdR + cm.rtsR) / refM;
  const yScale = yd.reduce((a, d) => a + d.rtdR + d.rtsR, 0) / refY;
  const perLabel = `${MONTHS_ID[month]} ${year}`;

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
                <button key={c} onClick={() => pickChannel(c)}
                  className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", channel === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{c}</button>
              ))}
            </div>
            <RepPicker reps={reps} selected={selected} setSelected={setSelected} />
            <SettingsModal open={settingsOpen} setOpen={setSettingsOpen} targetAdj={targetAdj} setTargetAdj={setTargetAdj} targets={targets} setTargets={setTargets} mode={targetMode} setMode={setTargetMode} sheets={sheets} setSheets={setSheets} onSync={loadSheet} syncMsg={syncMsg} />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3 lg:px-8">
            <CalendarDays className="h-4 w-4 text-primary" />
            <select aria-label="Filter Tahun" value={year} onChange={(e) => setYear(+e.target.value)} className="h-8 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground">{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <select aria-label="Filter Bulan" value={month} onChange={(e) => setMonth(+e.target.value)} className="h-8 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground">{MONTHS_ID.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
            <div className="flex rounded-full border border-border bg-card p-1">
              {([["full", "Akhir Bulan / Full Month"], ["daily", "Harian Berjalan / Cut-off Hari Ini"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setCutoff(k)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", cutoff === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{l}</button>
              ))}
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Cut-off per: {cutLabel}</span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", dms ? "bg-success/15 text-success" : "bg-surface text-muted-foreground")}>{dms ? `Data DMS · ${dms.length.toLocaleString("id-ID")} baris` : "Data contoh (sheet belum terhubung)"}</span>
          </div>
          <div className="flex flex-wrap gap-1 px-5 pb-3 lg:px-8">
            <button onClick={() => setView(view === "exec" ? "stock" : "exec")} className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground md:hidden">{view === "exec" ? "→ Stok & DOI" : "→ Dashboard"}</button>
            {view === "exec" && ["Performance", "Brand & Packaging", "Pareto"].map((t, i) => (
              <button key={t} onClick={() => setTab(i)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === i ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>{t}</button>
            ))}
          </div>
        </header>

        <main className="space-y-6 p-5 lg:p-8">
          {view === "stock" && <StockMonitor cutoffLabel={cutLabel} />}
          {view === "exec" && tab === 0 && (
            <>
              <SectionTitle n="01" title="Executive Performance & Gap Monitoring" sub={`${month >= 9 ? `Q3 Closed & MTD ${perLabel}` : `Periode: ${perLabel}`} (vs Baseline ${year - 1})`} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="glass-card relative overflow-hidden p-5 glow-primary">
                  <CardHead icon={Target} label="Realisasi vs Target" />
                  <p className="mt-4 whitespace-nowrap font-display text-3xl font-semibold" title={rpFull(real)}>{fmt(real)}</p>
                  <p className="whitespace-nowrap text-sm text-muted-foreground" title={rpFull(target)}>dari {fmt(target)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (real / target) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-primary">{pct(real / target)} Ach</p>
                </div>
                <div className="glass-card p-5">
                  <CardHead icon={Wallet} label="Net Gap Value" />
                  <p className={cn("mt-4 whitespace-nowrap font-display text-3xl font-semibold", gap < 0 ? "text-danger" : "text-success")} title={rpFull(gap)}>{fmt(gap)}</p>
                  <span className={cn("mt-3 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", gap < 0 ? "bg-danger/15 text-danger" : "bg-success/15 text-success")}>
                    {gap < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}{gap < 0 ? "Defisit" : "Surplus"}
                  </span>
                </div>
                <div className="glass-card p-5">
                  <CardHead icon={TrendingUp} label="Growth YoY (bulan)" />
                  <p className={cn("mt-4 font-display text-3xl font-semibold", growth < 0 ? "text-danger" : "text-success")}>{growth >= 0 ? "+" : ""}{pct(growth)}</p>
                  <p className="mt-1 whitespace-nowrap text-sm text-muted-foreground">{year} vs {year - 1} · {fmt(ly)} LY</p>
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
                      <YAxis yAxisId="v" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)} M` : `${Math.round(v / 1e6)} Jt`)} width={52} />
                      <YAxis yAxisId="p" orientation="right" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} fontSize={11} unit="%" width={44} domain={[0, 130]} />
                      <Tooltip cursor={{ fill: "var(--surface)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
                        formatter={(v: number, n: string) => (n === "% Ach" ? `${v}%` : rpFull(v))} />
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
                  <AccordionContent><DetailTable yd={yd} month={month} factor={factor} adj={targetAdj / 100} /></AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}

          {view === "exec" && tab === 1 && <BrandSlide period={period} setPeriod={setPeriod} factor={agg ? 1 : factor} mScale={agg ? 1 : mScale} yScale={agg ? 1 : yScale} perLabel={perLabel} pack={agg?.pack} />}

          {view === "exec" && tab === 2 && (
            <>
              <SectionTitle n="03" title="Top 15 Pareto Outlet" sub={`Top 15 Pareto s/d ${perLabel}`} />
              <div className="glass-card overflow-x-auto p-5 hover:translate-y-0">
                <ParetoTable factor={factor * yScale} outlets={agg?.outlets} total={agg?.ytdTotal} />
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

const BADGE: Record<string, string> = { LOKMAN: "bg-info/15 text-info", MOT: "bg-chart-5/15 text-chart-5", NKA: "bg-warning/15 text-warning", GT: "bg-success/15 text-success", MT: "bg-info/15 text-info", Horeca: "bg-chart-3/15 text-chart-3" };
function RepPicker({ reps, selected, setSelected }: { reps: Rep[]; selected: string[]; setSelected: (s: string[]) => void }) {
  const [q, setQ] = useState("");
  const all = selected.length === reps.length;
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const quick: [string, () => void][] = [
    ["Pilih Semua GT", () => setSelected(reps.filter((r) => r.channel === "GT").map((r) => r.id))],
    ["Pilih Semua Modern (NKA / MOT / LOKMAN)", () => setSelected(reps.filter((r) => r.channel === "NKA" || r.channel === "MT").map((r) => r.id))],
    ["Reset Pilihan", () => setSelected(reps.map((r) => r.id))],
  ];
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
          <div className="mt-3 flex flex-wrap gap-1.5">
            {quick.map(([l, fn]) => <button key={l} onClick={fn} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold hover:border-primary/50 hover:text-primary">{l}</button>)}
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <Checkbox checked={all} onCheckedChange={() => setSelected(all ? [] : reps.map((r) => r.id))} />Pilih Semua
          </label>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {CHANNELS.map((c) => {
            const list = reps.filter((r) => r.channel === c && r.name.toLowerCase().includes(q.toLowerCase()));
            if (!list.length) return null;
            return (
              <div key={c} className="mb-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">{c}</p>
                {list.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                    <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} /><span className="flex-1">{r.name}</span>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", BADGE[r.badge] ?? "bg-surface text-muted-foreground")}>{r.badge}</span>
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

type Tg = { rtd: number; rts: number }[];
function SettingsModal({ open, setOpen, targetAdj, setTargetAdj, targets, setTargets, mode, setMode, sheets, setSheets, onSync, syncMsg }: { open: boolean; setOpen: (b: boolean) => void; targetAdj: number; setTargetAdj: (n: number) => void; targets: Tg; setTargets: (t: Tg) => void; mode: "link" | "manual"; setMode: (m: "link" | "manual") => void; sheets: string[]; setSheets: (s: string[]) => void; onSync: (i: number, src: string | File) => void; syncMsg: string[] }) {
  const slots = ["URL Google Sheets: Data Tahunan (2025 Baseline)", "URL Google Sheets: Data Realisasi Bulan Berjalan 2026", "Target 2026 (RTD / RTS)", "URL Google Sheets: Monitoring Stok & DOI Depo"];
  const edit = (i: number, k: "rtd" | "rts", v: string) => setTargets(targets.map((t, j) => (j === i ? { ...t, [k]: Math.max(0, cleanNum(v)) } : t)));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground glow-primary">
        <Settings className="h-4 w-4" />Data & Target
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Data & Target Settings</DialogTitle><DialogDescription>Sinkronisasi Google Sheets dan input target manual.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {slots.map((l, i) => (
            <div key={l} className="space-y-2 rounded-xl border border-border bg-surface/50 p-3">
              <Label className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>{l}</Label>
              {i === 2 && (
                <div className="flex rounded-full bg-card p-1">
                  {([["link", "Link Google Sheets Target"], ["manual", "Input Manual Grid"]] as const).map(([k, t]) => (
                    <button key={k} onClick={() => setMode(k)} className={cn("flex-1 rounded-full px-3 py-1 text-xs font-semibold", mode === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>
                  ))}
                </div>
              )}
              {(i !== 2 || mode === "link") && (
                <div className="flex gap-2">
                  <div className="relative flex-1"><Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={sheets[i] ?? ""} onChange={(e) => setSheets(sheets.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://docs.google.com/spreadsheets/..." /></div>
                  {i < 2 && <button disabled={!sheets[i]} onClick={() => onSync(i, sheets[i]!)} className="rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-40">Sync</button>}
                </div>
              )}
              {i < 2 && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 font-semibold hover:border-primary/50">Unggah CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onSync(i, e.target.files[0])} /></label>
                  <span className={cn(syncMsg[i]?.startsWith("✗") ? "text-danger" : syncMsg[i]?.startsWith("✓") ? "text-success" : "text-muted-foreground")}>{syncMsg[i] || "Kolom DMS: TANGGAL, BULAN, CHANNEL, NAMASALESMAN, NAMACUSTOMER, BRAND, NAMAPRODUK, NETAMOUNT, QTYSOLDCRT"}</span>
                </div>
              )}
              {i === 2 && mode === "manual" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[3rem_minmax(9rem,1fr)_minmax(9rem,1fr)] gap-1.5 text-xs">
                    <span /><span className="text-muted-foreground">Target RTD (Rp)</span><span className="text-muted-foreground">Target RTS (Rp)</span>
                    {targets.map((t, j) => (
                      <Fragment key={j}>
                        <span className="self-center font-semibold">{MONTHS[j]}</span>
                        <Input className="h-8 text-right tabular-nums" inputMode="numeric" title={rpFull(t.rtd)} value={Math.round(t.rtd).toLocaleString("id-ID")} onChange={(e) => edit(j, "rtd", e.target.value)} />
                        <Input className="h-8 text-right tabular-nums" inputMode="numeric" title={rpFull(t.rts)} value={Math.round(t.rts).toLocaleString("id-ID")} onChange={(e) => edit(j, "rts", e.target.value)} />
                      </Fragment>
                    ))}
                  </div>
                  <Label className="text-xs text-muted-foreground">Penyesuaian Target (%)</Label>
                  <Input type="number" value={targetAdj} onChange={(e) => setTargetAdj(Math.max(1, Number(e.target.value) || 100))} />
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BrandSlide({ period, setPeriod, factor, mScale, yScale, perLabel, pack }: { period: Period; setPeriod: (p: Period) => void; factor: number; mScale: number; yScale: number; perLabel: string; pack?: PackRow[] | undefined }) {
  const SRC = pack ?? PACKAGING;
  const [open, setOpen] = useState<string | null>(null);
  const rows = SRC.map((p) => {
    const sc = period === "mtd" ? mScale : yScale;
    const vol = (period === "mtd" ? p.mtdVol : p.ytdVol) * factor * sc;
    const val = (period === "mtd" ? p.mtdVal : p.ytdVal) * factor * sc;
    const lyv = period === "mtd" ? p.lyMtdVal : p.lyYtdVal;
    const gwt = lyv ? (period === "mtd" ? p.mtdVal : p.ytdVal) / lyv - 1 : 0;
    return { ...p, vol, val, gwt };
  });
  const total = rows.reduce((a, r) => a + r.val, 0) || 1;
  const totalVol = rows.reduce((a, r) => a + r.vol, 0);
  const lyTotal = SRC.reduce((a, p) => a + (period === "mtd" ? p.lyMtdVal * mScale : p.lyYtdVal * yScale), 0) * factor || 1;
  const pie = rows.map((r) => ({ name: r.cat, value: period === "yoy" ? Math.max(0, +(r.gwt * 100).toFixed(1)) || 0.1 : +(r.val / total * 100).toFixed(1) }));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle n="02" title="Brand & Packaging Distribution Analysis" sub={period === "mtd" ? `Periode: ${perLabel}` : period === "ytd" ? `Kumulatif YTD s/d ${perLabel}` : `Pertumbuhan YTD s/d ${perLabel} vs tahun lalu`} />
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
                <Fragment key={r.cat}>
                <tr className="cursor-pointer border-b border-border/60 hover:bg-surface/50" onClick={() => setOpen(open === r.cat ? null : r.cat)}>
                  <td className="py-3"><div className="flex items-center gap-2"><ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open !== r.cat && "-rotate-90")} /><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} /><div><p className="font-semibold">{r.cat}</p><p className="text-xs text-muted-foreground">{r.brand}</p></div></div></td>
                  <td className="whitespace-nowrap text-right tabular-nums">{Math.round(r.vol).toLocaleString("id-ID")}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.val)}</td>
                  <td className="text-right tabular-nums">{pct(r.val / total)}</td>
                  <td className="text-right"><span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", r.gwt >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>{r.gwt >= 0 ? "+" : ""}{pct(r.gwt)}</span></td>
                </tr>
                {open === r.cat && CATEGORY_MAP[r.cat as PackCat].map((b, j, arr) => {
                  const w = (arr.length - j) / ((arr.length * (arr.length + 1)) / 2);
                  return (
                    <tr key={b} className="border-b border-border/40 bg-surface/30 text-xs">
                      <td className="py-2 pl-10 text-muted-foreground">{b}</td>
                      <td className="text-right tabular-nums">{Math.round(r.vol * w).toLocaleString("id-ID")}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{fmt(r.val * w)}</td>
                      <td className="text-right tabular-nums">{pct((r.val * w) / total)}</td><td />
                    </tr>
                  );
                })}
                </Fragment>
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

type YD = { rtdT: number; rtsT: number; rtdR: number; rtsR: number; rtdLY: number; rtsLY: number };
function DetailTable({ yd, month, factor, adj }: { yd: YD[]; month: number; factor: number; adj: number }) {
  const c = "whitespace-nowrap px-3 py-2 text-right tabular-nums";
  const num = (v: number) => Math.round(v).toLocaleString("id-ID");
  const gwt = (a: number, b: number) => {
    if (!a || !b) return <span className="text-muted-foreground">–</span>;
    const g = (a / b - 1) * 100;
    return <span className={g >= 0 ? "text-success" : "text-danger"}>{g >= 0 ? "▲ +" : "▼ "}{g.toFixed(2)}%</span>;
  };
  const ach = (r: number, t: number) => (!r || !t ? "–" : `${Math.round((r / t) * 100)}%`);
  const sum = (idx: number[]) => idx.reduce<YD>((a, i) => { const d = yd[i]!; return { rtdT: a.rtdT + d.rtdT, rtsT: a.rtsT + d.rtsT, rtdR: a.rtdR + d.rtdR, rtsR: a.rtsR + d.rtsR, rtdLY: a.rtdLY + d.rtdLY, rtsLY: a.rtsLY + d.rtsLY }; }, { rtdT: 0, rtsT: 0, rtdR: 0, rtsR: 0, rtdLY: 0, rtsLY: 0 });
  const layout: (number | [string, number[], "q" | "sm"])[] = [0, 1, 2, ["Q1", [0, 1, 2], "q"], 3, 4, 5, ["Q2", [3, 4, 5], "q"], ["SM 1", [0, 1, 2, 3, 4, 5], "sm"], 6, 7, 8, ["Q3", [6, 7, 8], "q"], 9, 10, 11];
  const cells = (d: YD, sub?: boolean) => {
    const tD = d.rtdT * factor * adj, tS = d.rtsT * factor * adj, rD = d.rtdR * factor, rS = d.rtsR * factor, lD = d.rtdLY * factor, lS = d.rtsLY * factor;
    const g = (a: number, b: number) => sub ? (!a || !b ? "–" : `${a >= b ? "▲ +" : "▼ "}${((a / b - 1) * 100).toFixed(2)}%`) : gwt(a, b);
    return (<>
      <td className={c}>{num(lD)}</td><td className={c}>{num(lS)}</td>
      <td className={cn(c, !sub && "bg-warning/10")}>{num(tD)}</td><td className={cn(c, !sub && "bg-warning/10")}>{num(tS)}</td>
      <td className={c}>{g(tD, lD)}</td><td className={c}>{g(tS, lS)}</td>
      <td className={c}>{rD ? num(rD) : "–"}</td><td className={c}>{rS ? num(rS) : "–"}</td>
      <td className={c}>{ach(rD, tD)}</td><td className={c}>{ach(rS, tS)}</td>
      <td className={c}>{g(rD, lD)}</td><td className={c}>{g(rS, lS)}</td>
    </>);
  };
  const groups = ["YTD 2025", "Target 2026", "% GWT (Target vs '25)", "Realisasi YTD 2026", "% Ach (Real vs Target '26)", "% GWT ('26 vs '25)"];
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-max w-full text-xs">
        <thead className="bg-surface text-muted-foreground">
          <tr>
            <th rowSpan={2} className="sticky left-0 z-10 bg-surface px-3 py-2 text-left">Bulan</th>
            {groups.map((g) => <th key={g} colSpan={2} className={cn("whitespace-nowrap border-l border-border px-3 py-2 text-center", g === "Target 2026" ? "bg-warning/20 font-semibold text-warning" : "bg-background/40")}>{g}</th>)}
          </tr>
          <tr>{groups.map((g) => ["RTD", "RTS"].map((x) => <th key={g + x} className={cn("px-3 py-1.5 text-right", x === "RTD" && "border-l border-border", g === "Target 2026" && "bg-warning/10")}>{x}</th>))}</tr>
        </thead>
        <tbody>
          {layout.map((r) => {
            if (typeof r === "number") {
              const active = r === month;
              return (
                <tr key={r} className={cn("border-t border-border hover:bg-surface/50", active && "bg-primary/15")}>
                  <td className={cn("sticky left-0 z-10 whitespace-nowrap px-3 py-2 font-semibold", active ? "bg-card" : "bg-card")}>
                    {MONTHS_ID[r]}{active && <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">MTD</span>}
                  </td>
                  {cells(yd[r]!)}
                </tr>
              );
            }
            const [label, idx, kind] = r;
            return (
              <tr key={label} className={cn("border-t border-border font-bold", kind === "q" ? "bg-warning text-background" : "bg-warning/25 text-warning")}>
                <td className={cn("sticky left-0 z-10 px-3 py-2", kind === "q" ? "bg-warning" : "bg-card")}>{label}</td>
                {cells(sum(idx), true)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ParetoTable({ factor, outlets, total: realTotal }: { factor: number; outlets?: Outlet[] | undefined; total?: number | undefined }) {
  const list: Outlet[] = outlets ?? OUTLETS;
  const f = outlets ? 1 : factor;
  const total = (outlets ? realTotal || 1 : OUTLETS.reduce((a, o) => a + o.value, 0) / 0.62);
  let cum = 0;
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground">
        <tr className="border-b border-border"><th className="py-2 text-left">#</th><th className="text-left">Outlet</th><th className="text-left">Channel</th><th className="text-right">Realisasi</th><th className="text-right">Share</th><th className="w-48 pl-6 text-left">Kumulatif</th></tr>
      </thead>
      <tbody>
        {list.map((o, i) => {
          const s = o.value / total; cum += s;
          return (
            <tr key={o.name} className="border-b border-border/60 hover:bg-surface/50">
              <td className="py-2.5 font-display font-semibold text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
              <td className="whitespace-nowrap font-medium">{o.name}{cum <= 0.8 && <span className="ml-2 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">A</span>}</td>
              <td><span className="rounded-full bg-surface px-2 py-0.5 text-xs">{o.channel}</span></td>
              <td className="whitespace-nowrap text-right tabular-nums">{fmt(o.value * f)}</td>
              <td className="text-right tabular-nums">{pct(s)}</td>
              <td className="pl-6"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-surface"><div className="h-full rounded-full bg-primary" style={{ width: `${cum * 100}%` }} /></div><span className="w-12 text-right text-xs tabular-nums">{pct(cum)}</span></div></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
