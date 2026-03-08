import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  signal,
  HostListener
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { forkJoin } from 'rxjs';

import { MarketChartService } from '../../services/market-chart.service';
import { MarketChartResponse } from '../../models/market-chart';

import {
  createChart,
  IChartApi,
  LineData,
  HistogramData,
  CandlestickData,
  Time,
  LineSeries,
  HistogramSeries,
  CandlestickSeries,
} from 'lightweight-charts';

type CombinedChartData = {
  symbol: string;
  daily: MarketChartResponse;
  weekly: MarketChartResponse;
};

type PriceMode = 'LINE' | 'CANDLE';

type CandlePoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type LinePoint = {
  date: string;
  value: number;
};

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
  chart = signal<CombinedChartData | null>(null);

  dailyMode = signal<PriceMode>('CANDLE');
  weeklyMode = signal<PriceMode>('LINE');

  crosshairDate = signal<string | null>(null);
  dailyOhlcText = signal<string | null>(null);
  weeklyOhlcText = signal<string | null>(null);

  @ViewChild('priceEl', { static: false }) priceEl?: ElementRef<HTMLDivElement>;
  @ViewChild('indMenu', { static: false }) indMenu?: ElementRef<HTMLDetailsElement>;
  @ViewChild('rsiEl', { static: false }) rsiEl?: ElementRef<HTMLDivElement>;
  @ViewChild('macdEl', { static: false }) macdEl?: ElementRef<HTMLDivElement>;

  private priceChart?: IChartApi;
  private rsiChart?: IChartApi;
  private macdChart?: IChartApi;

  private resizeObs?: ResizeObserver;

  showEma20 = signal(true);
  showEma50 = signal(true);
  showEma200 = signal(true);
  showRsi = signal(false);
  showMacd = signal(false);

  private dailyLineSeries?: any;
  private dailyCandleSeries?: any;
  private weeklyLineSeries?: any;
  private weeklyCandleSeries?: any;

  private dailyVolumeSeries?: any;
  private weeklyVolumeSeries?: any;

  private ema20Series?: any;
  private ema50Series?: any;
  private ema200Series?: any;

  private rsiSeries?: any;
  private macdSeries?: any;
  private macdSignalSeries?: any;
  private macdHistSeries?: any;

  private _fromUrl: string | null = null;

  private dailyLineMap = new Map<string, LinePoint>();
  private weeklyLineMap = new Map<string, LinePoint>();
  private dailyCandleMap = new Map<string, CandlePoint>();
  private weeklyCandleMap = new Map<string, CandlePoint>();

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

    this._fromUrl = this.route.snapshot.queryParamMap.get('from');
    this.load(symbol);
  }

  chartReady() {
    const c = this.chart();
    return !!c && ((c.daily?.bars?.length ?? 0) > 0 || (c.weekly?.bars?.length ?? 0) > 0);
  }

  back() {
    if (this._fromUrl) {
      this.router.navigateByUrl(this._fromUrl);
      return;
    }
    this.location.back();
  }

  setDailyMode(mode: PriceMode) {
    if (this.dailyMode() === mode) return;
    this.dailyMode.set(mode);

    const data = this.chart();
    if (data) queueMicrotask(() => this.render(data));
  }

  setWeeklyMode(mode: PriceMode) {
    if (this.weeklyMode() === mode) return;
    this.weeklyMode.set(mode);

    const data = this.chart();
    if (data) queueMicrotask(() => this.render(data));
  }

  ngOnDestroy() {
    this.destroyCharts();
    this.resizeObs?.disconnect();
  }

  private load(symbol: string) {
    this.loading.set(true);

    forkJoin({
      daily: this.chartApi.getDailyChart(symbol),
      weekly: this.chartApi.getWeeklyChart(symbol),
    }).subscribe({
      next: ({ daily, weekly }) => {
        const combined: CombinedChartData = { symbol, daily, weekly };
        this.chart.set(combined);
        queueMicrotask(() => this.render(combined));
      },
      error: (err) => {
        console.error('chart API error:', err);
        this.chart.set(null);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  private render(res: CombinedChartData) {
    if (!this.priceEl?.nativeElement) return;

    this.destroyCharts();

    this.dailyLineMap.clear();
    this.weeklyLineMap.clear();
    this.dailyCandleMap.clear();
    this.weeklyCandleMap.clear();

    const dailyClose: LineData[] = [];
    const weeklyClose: LineData[] = [];

    const dailyCandles: CandlestickData[] = [];
    const weeklyCandles: CandlestickData[] = [];

    const dailyVolume: HistogramData[] = [];
    const weeklyVolume: HistogramData[] = [];

    const ema20: LineData[] = [];
    const ema50: LineData[] = [];
    const ema200: LineData[] = [];
    const rsi: LineData[] = [];
    const macd: LineData[] = [];
    const macdSignal: LineData[] = [];
    const macdHist: HistogramData[] = [];

    let hasDailyOhlc = false;
    let hasWeeklyOhlc = false;

    for (const b of (res.daily?.bars as any[]) ?? []) {
      const t = b.date as unknown as Time;
      const date = String(b.date);

      if (b.close != null) {
        const close = Number(b.close);
        dailyClose.push({ time: t, value: close });
        this.dailyLineMap.set(date, { date, value: close });
      }

      if (b.volume != null) dailyVolume.push({ time: t, value: Number(b.volume) });

      if (b.open != null && b.high != null && b.low != null && b.close != null) {
        hasDailyOhlc = true;
        const cp: CandlePoint = {
          date,
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
        };
        dailyCandles.push({
          time: t,
          open: cp.open,
          high: cp.high,
          low: cp.low,
          close: cp.close,
        });
        this.dailyCandleMap.set(date, cp);
      }

      if (b.ema20 != null) ema20.push({ time: t, value: Number(b.ema20) });
      if (b.ema50 != null) ema50.push({ time: t, value: Number(b.ema50) });
      if (b.ema200 != null) ema200.push({ time: t, value: Number(b.ema200) });

      if (b.rsi14 != null) rsi.push({ time: t, value: Number(b.rsi14) });

      if (b.macd != null) macd.push({ time: t, value: Number(b.macd) });
      if (b.macdSignal != null) macdSignal.push({ time: t, value: Number(b.macdSignal) });
      if (b.macdHist != null) macdHist.push({ time: t, value: Number(b.macdHist) });
    }

    for (const b of (res.weekly?.bars as any[]) ?? []) {
      const t = b.date as unknown as Time;
      const date = String(b.date);

      if (b.close != null) {
        const close = Number(b.close);
        weeklyClose.push({ time: t, value: close });
        this.weeklyLineMap.set(date, { date, value: close });
      }

      if (b.volume != null) weeklyVolume.push({ time: t, value: Number(b.volume) });

      if (b.open != null && b.high != null && b.low != null && b.close != null) {
        hasWeeklyOhlc = true;
        const cp: CandlePoint = {
          date,
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
        };
        weeklyCandles.push({
          time: t,
          open: cp.open,
          high: cp.high,
          low: cp.low,
          close: cp.close,
        });
        this.weeklyCandleMap.set(date, cp);
      }
    }

    const mkMainChart = (el: HTMLDivElement) => {
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
        rightPriceScale: {
          visible: true,
          borderVisible: false,
          autoScale: true,
          scaleMargins: {
            top: 0.02,
            bottom: 0.30,
          },
        },
        leftPriceScale: {
          visible: true,
          borderVisible: false,
          autoScale: true,
          scaleMargins: {
            top: 0.75,
            bottom: 0.02,
          },
        },
        timeScale: {
          borderVisible: false,
          fixRightEdge: true,
          fixLeftEdge: true,
          rightOffsetPixels: 20,
        },
        crosshair: { mode: 1 },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: {
            time: true,
            price: false,
          },
          mouseWheel: true,
          pinch: true,
        }
      });
    };

    const mkIndicatorChart = (el: HTMLDivElement) => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(10, Math.floor(rect.width || el.clientWidth || 600));
      const h = Math.max(10, Math.floor(rect.height || el.clientHeight || 160));

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
        rightPriceScale: {
          visible: true,
          borderVisible: false,
          autoScale: true,
        },
        leftPriceScale: {
          visible: false,
          borderVisible: false,
        },
        timeScale: {
          borderVisible: false,
          fixRightEdge: true,
          fixLeftEdge: true,
          rightOffsetPixels: 20,
        },
        crosshair: { mode: 1 },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: {
            time: true,
            price: false,
          },
          mouseWheel: true,
          pinch: true,
        }
      });
    };

    this.priceChart = mkMainChart(this.priceEl.nativeElement);

    if (this.showRsi() && this.rsiEl?.nativeElement) {
      this.rsiChart = mkIndicatorChart(this.rsiEl.nativeElement);
    }

    if (this.showMacd() && this.macdEl?.nativeElement) {
      this.macdChart = mkIndicatorChart(this.macdEl.nativeElement);
    }

    this.dailyVolumeSeries = this.priceChart.addSeries(HistogramSeries, {
      priceScaleId: 'left',
      color: 'rgba(96, 125, 139, 0.28)',
      priceFormat: { type: 'volume' },
    });
    this.dailyVolumeSeries.setData(dailyVolume);

    this.weeklyVolumeSeries = this.priceChart.addSeries(HistogramSeries, {
      priceScaleId: 'left',
      color: 'rgba(56, 189, 248, 0.55)',
      priceFormat: { type: 'volume' },
    });
    this.weeklyVolumeSeries.setData(weeklyVolume);

    if (this.dailyMode() === 'CANDLE' && hasDailyOhlc) {
      this.dailyCandleSeries = this.priceChart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: true,
        wickVisible: true,
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      this.dailyCandleSeries.setData(dailyCandles);
    } else {
      this.dailyLineSeries = this.priceChart.addSeries(LineSeries, {
        lineWidth: 2,
        color: '#e5e7eb',
      });
      this.dailyLineSeries.setData(dailyClose);
    }

    if (this.weeklyMode() === 'CANDLE' && hasWeeklyOhlc) {
      this.weeklyCandleSeries = this.priceChart.addSeries(CandlestickSeries, {
        upColor: '#60a5fa',
        downColor: '#1d4ed8',
        borderVisible: true,
        wickVisible: true,
        borderUpColor: '#60a5fa',
        borderDownColor: '#1d4ed8',
        wickUpColor: '#60a5fa',
        wickDownColor: '#1d4ed8',
      });
      this.weeklyCandleSeries.setData(weeklyCandles);
    } else {
      this.weeklyLineSeries = this.priceChart.addSeries(LineSeries, {
        lineWidth: 2,
        color: '#38bdf8',
      });
      this.weeklyLineSeries.setData(weeklyClose);
    }

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

    if (this.rsiChart) {
      this.rsiSeries = this.rsiChart.addSeries(LineSeries, {
        lineWidth: 1,
        color: '#9c27b0',
      });
      this.rsiSeries.setData(rsi);
    }

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

    this.bindCrosshairReadout();
    this.setDefaultCrosshairReadout();

    this.syncTimeScales();
    this.priceChart.timeScale().fitContent();
    this.setInitialVisibleRange(res);

    this.resizeObs?.disconnect();
    this.resizeObs = new ResizeObserver(() => {
      this.resizeAll();
      this.priceChart?.timeScale().fitContent();
    });
    this.resizeObs.observe(this.priceEl.nativeElement);

    queueMicrotask(() => {
      this.resizeAll();
      this.priceChart?.timeScale().fitContent();
    });
  }

  private bindCrosshairReadout() {
    if (!this.priceChart) return;

    this.priceChart.subscribeCrosshairMove((param: any) => {
      if (!param?.time) {
        this.setDefaultCrosshairReadout();
        return;
      }

      const date = this.timeToDateString(param.time);
      if (!date) {
        this.setDefaultCrosshairReadout();
        return;
      }

      this.crosshairDate.set(date);
      this.dailyOhlcText.set(this.buildDailyReadout(date));
      this.weeklyOhlcText.set(this.buildWeeklyReadout(date));
    });
  }

  private setDefaultCrosshairReadout() {
    const latestDailyDate = this.getLatestKey(this.dailyCandleMap, this.dailyLineMap);
    const latestWeeklyDate = this.getLatestKey(this.weeklyCandleMap, this.weeklyLineMap);
    const latest = [latestDailyDate, latestWeeklyDate].filter(Boolean).sort().at(-1) ?? null;

    this.crosshairDate.set(latest);
    this.dailyOhlcText.set(latestDailyDate ? this.buildDailyReadout(latestDailyDate) : null);
    this.weeklyOhlcText.set(latestWeeklyDate ? this.buildWeeklyReadout(latestWeeklyDate) : null);
  }

  private buildDailyReadout(date: string): string | null {
    if (this.dailyMode() === 'CANDLE') {
      const c = this.dailyCandleMap.get(date);
      if (!c) return null;
      return `O ${this.fmt(c.open)} H ${this.fmt(c.high)} L ${this.fmt(c.low)} C ${this.fmt(c.close)}`;
    }

    const p = this.dailyLineMap.get(date);
    if (!p) return null;
    return `Close ${this.fmt(p.value)}`;
  }

  private buildWeeklyReadout(date: string): string | null {
    if (this.weeklyMode() === 'CANDLE') {
      const c = this.weeklyCandleMap.get(date);
      if (!c) return null;
      return `O ${this.fmt(c.open)} H ${this.fmt(c.high)} L ${this.fmt(c.low)} C ${this.fmt(c.close)}`;
    }

    const p = this.weeklyLineMap.get(date);
    if (!p) return null;
    return `Close ${this.fmt(p.value)}`;
  }

  private getLatestKey(
    candleMap: Map<string, CandlePoint>,
    lineMap: Map<string, LinePoint>
  ): string | null {
    const keys = [...candleMap.keys(), ...lineMap.keys()].sort();
    return keys.length ? keys[keys.length - 1] : null;
  }

  private fmt(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return n.toFixed(2);
  }

  private timeToDateString(time: any): string | null {
    if (!time) return null;

    if (typeof time === 'string') {
      return time;
    }

    if (typeof time === 'object' && time.year && time.month && time.day) {
      const y = String(time.year);
      const m = String(time.month).padStart(2, '0');
      const d = String(time.day).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return null;
  }

  private syncTimeScales() {
    const charts = [this.priceChart, this.rsiChart, this.macdChart].filter(Boolean) as IChartApi[];
    if (charts.length < 2) return;

    let syncing = false;

    const propagate = (src: IChartApi, range: any) => {
      if (!range || syncing) return;
      syncing = true;
      try {
        for (const c of charts) {
          if (c !== src) c.timeScale().setVisibleLogicalRange(range);
        }
      } finally {
        syncing = false;
      }
    };

    for (const c of charts) {
      c.timeScale().subscribeVisibleLogicalRangeChange((range) => propagate(c, range));
    }
  }

  private setInitialVisibleRange(res: CombinedChartData) {
    if (!this.priceChart) return;

    const dates = [
      ...(res.daily?.bars ?? []).map(b => b.date),
      ...(res.weekly?.bars ?? []).map(b => b.date),
    ].sort();

    if (dates.length < 2) return;

    const from = dates[0] as unknown as Time;
    const to = dates[dates.length - 1] as unknown as Time;

    this.priceChart.timeScale().setVisibleRange({ from, to });
    this.rsiChart?.timeScale().setVisibleRange({ from, to });
    this.macdChart?.timeScale().setVisibleRange({ from, to });
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
    this.priceChart?.remove();
    this.priceChart = undefined;

    this.rsiChart?.remove();
    this.rsiChart = undefined;

    this.macdChart?.remove();
    this.macdChart = undefined;

    this.dailyLineSeries = undefined;
    this.dailyCandleSeries = undefined;
    this.weeklyLineSeries = undefined;
    this.weeklyCandleSeries = undefined;

    this.dailyVolumeSeries = undefined;
    this.weeklyVolumeSeries = undefined;

    this.ema20Series = undefined;
    this.ema50Series = undefined;
    this.ema200Series = undefined;

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
      this.priceChart?.timeScale().fitContent();
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

    if (menu.open && !menu.contains(ev.target as Node)) {
      menu.open = false;
    }
  }
}