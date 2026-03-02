import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  signal,
  HostListener, 
  AfterViewInit
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { MarketChartService } from '../../services/market-chart.service';
import { MarketChartResponse } from '../../models/market-chart';

import {
  createChart,
  IChartApi,
  LineData,
  HistogramData,
  Time,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';

@Component({
  selector: 'app-returns-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './returns-chart.component.html',
  styleUrls: ['./returns-chart.component.css'],
})
export class ReturnsChartComponent implements OnInit, OnDestroy {
  symbol = signal<string>('');
  loading = signal(false);
  chart = signal<MarketChartResponse | null>(null);

  // ✅ Single combined Price+Volume chart
  @ViewChild('priceEl', { static: false }) priceEl?: ElementRef<HTMLDivElement>;
  @ViewChild('indMenu', { static: false }) indMenu?: ElementRef<HTMLDetailsElement>;
  // Optional panes
  @ViewChild('rsiEl', { static: false }) rsiEl?: ElementRef<HTMLDivElement>;
  @ViewChild('macdEl', { static: false }) macdEl?: ElementRef<HTMLDivElement>;

  private priceChart?: IChartApi;
  private rsiChart?: IChartApi;
  private macdChart?: IChartApi;

  private resizeObs?: ResizeObserver;

  // Indicator toggles (RSI/MACD hidden by default)
  showEma20 = signal(true);
  showEma50 = signal(true);
  showEma200 = signal(true);
  showRsi = signal(false);
  showMacd = signal(false);

  // series handles (so we can toggle visibility without re-fetch)
  private ema20Series?: any;
  private ema50Series?: any;
  private ema200Series?: any;

  private volSeries?: any;

  private rsiSeries?: any;
  private macdSeries?: any;
  private macdSignalSeries?: any;
  private macdHistSeries?: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chartApi: MarketChartService,
    private location: Location
  ) {}

  ngOnInit() {
  const sym = this.route.snapshot.paramMap.get('symbol');
  if (!sym) return;

  const symbol = sym.toUpperCase();
  this.symbol.set(symbol);

  // ✅ remember originating URL (passed by caller)
  // example: /watchlist/deviation?sort=... or /swing/groups?status=OPEN
  const from = this.route.snapshot.queryParamMap.get('from');

  // store it in a simple field OR signal (either is fine)
  // using a private field here:
  this._fromUrl = from;

  this.load(symbol);
}

// ✅ keep this field inside the class
private _fromUrl: string | null = null;

back() {
  // ✅ If we have an explicit origin, go back there
  if (this._fromUrl) {
    this.router.navigateByUrl(this._fromUrl);
    return;
  }

  // ✅ Fallback: behave like browser back
  this.location.back();
}

  ngOnDestroy() {
    this.destroyCharts();
    this.resizeObs?.disconnect();
  }
  private load(symbol: string) {
    this.loading.set(true);
    this.chartApi.getChart(symbol).subscribe({
      next: (res) => {
        this.chart.set(res);
        queueMicrotask(() => this.render(res));
      },
      error: (err) => {
        console.error('chart API error:', err);
        this.chart.set(null);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  private render(res: MarketChartResponse) {
    // Price chart container is required. RSI/MACD panes are optional.
    if (!this.priceEl?.nativeElement) return;

    this.destroyCharts();

    // Build time-series arrays
    const close: LineData[] = [];
    const ema20: LineData[] = [];
    const ema50: LineData[] = [];
    const ema200: LineData[] = [];
    const volume: HistogramData[] = [];
    const rsi: LineData[] = [];
    const macd: LineData[] = [];
    const macdSignal: LineData[] = [];
    const macdHist: HistogramData[] = [];

    for (const b of res.bars ?? []) {
      const t = b.date as unknown as Time; // YYYY-MM-DD works as Time

      if (b.close != null) close.push({ time: t, value: b.close });
      if (b.ema20 != null) ema20.push({ time: t, value: b.ema20 });
      if (b.ema50 != null) ema50.push({ time: t, value: b.ema50 });
      if (b.ema200 != null) ema200.push({ time: t, value: b.ema200 });

      if (b.volume != null) volume.push({ time: t, value: b.volume });

      if (b.rsi14 != null) rsi.push({ time: t, value: b.rsi14 });

      if (b.macd != null) macd.push({ time: t, value: b.macd });
      if (b.macdSignal != null) macdSignal.push({ time: t, value: b.macdSignal });
      if (b.macdHist != null) macdHist.push({ time: t, value: b.macdHist });
    }

    const mkChart = (el: HTMLDivElement) => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(10, Math.floor(rect.width || el.clientWidth || 600));
      const h = Math.max(10, Math.floor(rect.height || el.clientHeight || 200));

      return createChart(el, {
        width: w,
        height: h,
        layout: {
          background: { color: '#0b1220' },
          textColor: '#cbd5e1',
        },
        grid: {
          vertLines: { color: 'rgba(148,163,184,0.15)' },
          horzLines: { color: 'rgba(148,163,184,0.15)' },
        },

        // ✅ Two Y scales: right for price, left for volume
        rightPriceScale: { visible: true, borderVisible: false },
        leftPriceScale: {
          visible: true,
          borderVisible: false,
          // Keep volume visually in the lower band of the same pane
          scaleMargins: { top: 0.75, bottom: 0.02 },
        },

        timeScale: {
          borderVisible: false,
          fixRightEdge: true,
          fixLeftEdge: true,          // prevents “empty time” before first bar
          rightOffsetPixels: 40,      // small breathing room on right
        },

        crosshair: { mode: 1 },
      });
    };

    // Create charts
    this.priceChart = mkChart(this.priceEl.nativeElement);

    if (this.showRsi() && this.rsiEl?.nativeElement) {
      this.rsiChart = mkChart(this.rsiEl.nativeElement);
    }
    if (this.showMacd() && this.macdEl?.nativeElement) {
      this.macdChart = mkChart(this.macdEl.nativeElement);
    }

    // --- Price series (RIGHT scale by default) ---
    const closeSeries = this.priceChart.addSeries(LineSeries, {
      lineWidth: 2,
      color: '#e5e7eb', // close
    });
    closeSeries.setData(close);

    this.ema20Series = this.priceChart.addSeries(LineSeries, {
      lineWidth: 1,
      color: '#00bcd4',
      visible: this.showEma20(),
    });
    this.ema20Series.setData(ema20);

    this.ema50Series = this.priceChart.addSeries(LineSeries, {
      lineWidth: 1,
      color: '#ff9800',
      visible: this.showEma50(),
    });
    this.ema50Series.setData(ema50);

    this.ema200Series = this.priceChart.addSeries(LineSeries, {
      lineWidth: 1,
      color: '#e91e63',
      visible: this.showEma200(),
    });
    this.ema200Series.setData(ema200);

    // --- Volume series (LEFT scale) in SAME chart ---
    this.volSeries = this.priceChart.addSeries(HistogramSeries, {
      priceScaleId: 'left', // ✅ attach to left Y-axis
      color: '#607d8b',
      priceFormat: { type: 'volume' },
    });
    this.volSeries.setData(volume);

    // --- RSI (optional pane) ---
    if (this.rsiChart) {
      this.rsiSeries = this.rsiChart.addSeries(LineSeries, {
        lineWidth: 1,
        color: '#9c27b0',
      });
      this.rsiSeries.setData(rsi);
    }

    // --- MACD (optional pane) ---
    if (this.macdChart) {
      this.macdSeries = this.macdChart.addSeries(LineSeries, {
        lineWidth: 1,
        color: '#4caf50',
      });
      this.macdSeries.setData(macd);

      this.macdSignalSeries = this.macdChart.addSeries(LineSeries, {
        lineWidth: 1,
        color: '#f44336',
      });
      this.macdSignalSeries.setData(macdSignal);

      this.macdHistSeries = this.macdChart.addSeries(HistogramSeries, {
        color: '#607d8b',
      });
      this.macdHistSeries.setData(macdHist);
    }

    // Sync time range between panes + anchor latest at right + remove left blank time
    this.syncTimeScales();
    this.setInitialVisibleRange(res);
    this.scrollAllToLatest();

    // Resize handling
    this.resizeObs?.disconnect();
    this.resizeObs = new ResizeObserver(() => {
      this.resizeAll();
      // keep latest visible after layout changes
      this.scrollAllToLatest();
    });
    this.resizeObs.observe(this.priceEl.nativeElement);

    queueMicrotask(() => {
      this.resizeAll();
      this.setInitialVisibleRange(res);
      this.scrollAllToLatest();
    });
  }

  private syncTimeScales() {
    const charts = [this.priceChart, this.rsiChart, this.macdChart]
      .filter(Boolean) as IChartApi[];
    if (charts.length < 2) return;

    const propagate = (src: IChartApi, range: any) => {
      if (!range) return;
      for (const c of charts) if (c !== src) c.timeScale().setVisibleLogicalRange(range);
    };

    for (const c of charts) {
      c.timeScale().subscribeVisibleLogicalRangeChange((range) => propagate(c, range));
    }
  }

  private scrollAllToLatest() {
    // ✅ ensures latest price is visible at right edge
    this.priceChart?.timeScale().scrollToRealTime();
    this.rsiChart?.timeScale().scrollToRealTime();
    this.macdChart?.timeScale().scrollToRealTime();
  }

  private setInitialVisibleRange(res: MarketChartResponse) {
    if (!this.priceChart) return;

    const bars = res.bars ?? [];
    if (bars.length < 2) return;

    const from = bars[0].date as unknown as Time;
    const to = bars[bars.length - 1].date as unknown as Time;

    // ✅ show only the time span you actually have data for (removes empty left time)
    this.priceChart.timeScale().setVisibleRange({ from, to });
  }

  private resizeAll() {
    const resize = (c?: IChartApi, el?: ElementRef<HTMLDivElement>) => {
      if (!c || !el?.nativeElement) return;
      const w = Math.floor(el.nativeElement.clientWidth || 0);
      const h = Math.floor(el.nativeElement.clientHeight || 0);
      if (w > 0 && h > 0) c.applyOptions({ width: w, height: h });
    };

    resize(this.priceChart, this.priceEl);
    resize(this.rsiChart, this.rsiEl);
    resize(this.macdChart, this.macdEl);
  }

  private destroyCharts() {
    this.priceChart?.remove(); this.priceChart = undefined;
    this.rsiChart?.remove(); this.rsiChart = undefined;
    this.macdChart?.remove(); this.macdChart = undefined;

    this.ema20Series = undefined;
    this.ema50Series = undefined;
    this.ema200Series = undefined;

    this.volSeries = undefined;

    this.rsiSeries = undefined;
    this.macdSeries = undefined;
    this.macdSignalSeries = undefined;
    this.macdHistSeries = undefined;
  }

  toggleEma(which: 'ema20' | 'ema50' | 'ema200', ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;

    if (which === 'ema20') {
      this.showEma20.set(checked);
      this.ema20Series?.applyOptions({ visible: checked });
    }
    if (which === 'ema50') {
      this.showEma50.set(checked);
      this.ema50Series?.applyOptions({ visible: checked });
    }
    if (which === 'ema200') {
      this.showEma200.set(checked);
      this.ema200Series?.applyOptions({ visible: checked });
    }

    queueMicrotask(() => {
      this.resizeAll();
      this.scrollAllToLatest();
    });
  }

  toggleRsi(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.showRsi.set(checked);

    const data = this.chart();
    if (data) queueMicrotask(() => this.render(data));
  }

  toggleMacd(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.showMacd.set(checked);

    const data = this.chart();
    if (data) queueMicrotask(() => this.render(data));
  }

  @HostListener('document:click', ['$event'])
onDocClick(ev: MouseEvent) {
  const menu = this.indMenu?.nativeElement;
  if (!menu) return;

  // only close if it's open and click was outside
  if (menu.open && !menu.contains(ev.target as Node)) {
    menu.open = false;
  }
}
}