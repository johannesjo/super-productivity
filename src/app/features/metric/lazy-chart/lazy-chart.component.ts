import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectorRef,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
  EffectRef,
} from '@angular/core';
import type {
  ChartType,
  ChartData,
  ChartOptions,
  ActiveElement,
  ChartEvent,
  Chart as ChartJS,
  ChartConfiguration,
  ChartDataset,
  DefaultDataPoint,
} from 'chart.js';
import { ChartLazyLoaderService } from '../chart-lazy-loader.service';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import {
  MatButtonToggleGroup,
  MatButtonToggle,
  MatButtonToggleChange,
} from '@angular/material/button-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { ShareService } from '../../../core/share/share.service';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';

interface ChartClickEvent {
  active: ActiveElement[];
}

type LazyChartTimeframe = 'twoWeeks' | 'oneMonth' | 'max';

interface TimeframeOption {
  id: LazyChartTimeframe;
  labelKey: string;
  limit: number | null;
}

const TIMEFRAME_OPTIONS: ReadonlyArray<TimeframeOption> = [
  {
    id: 'twoWeeks',
    labelKey: 'F.METRIC.CMP.TIME_FRAME_2_WEEKS',
    limit: 14,
  },
  {
    id: 'oneMonth',
    labelKey: 'F.METRIC.CMP.TIME_FRAME_1_MONTH',
    limit: 30,
  },
  {
    id: 'max',
    labelKey: 'F.METRIC.CMP.TIME_FRAME_MAX',
    limit: null,
  },
];

@Component({
  selector: 'lazy-chart',
  template: `
    <div class="chart-wrapper">
      <div class="chart-toolbar">
        @if (enableTimeframeSelector) {
          <div class="timeframe-selector">
            <span class="timeframe-label">
              {{ 'F.METRIC.CMP.TIME_FRAME_LABEL' | translate }}
            </span>
            <mat-button-toggle-group
              class="timeframe-toggle"
              [value]="selectedTimeframe()"
              (change)="onTimeframeToggleChange($event)"
              [multiple]="false"
              [attr.aria-label]="'F.METRIC.CMP.TIME_FRAME_LABEL' | translate"
            >
              @for (option of timeframeOptions; track option.id) {
                <mat-button-toggle [value]="option.id">
                  {{ option.labelKey | translate }}
                </mat-button-toggle>
              }
            </mat-button-toggle-group>
          </div>
        }
        <button
          mat-icon-button
          class="share-btn"
          tabIndex="-1"
          type="button"
          (click)="shareChart()"
          [disabled]="!isLoaded || isSharing"
          [matTooltip]="'Share Chart' | translate"
        >
          @if (isSharing) {
            <mat-icon>hourglass_empty</mat-icon>
          } @else {
            <mat-icon>share</mat-icon>
          }
        </button>
      </div>
      @if (!isLoaded) {
        <div class="chart-loading">Loading chart...</div>
      }
      @if (isLoaded) {
        <div
          class="chart-container"
          [style.height]="height"
        >
          <canvas #canvas></canvas>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .chart-wrapper {
        width: 100%;
        position: relative;
      }
      .chart-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
      }
      .timeframe-selector {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .timeframe-label {
        font-size: 0.875rem;
        color: #666;
      }
      .timeframe-toggle {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        align-items: center;
      }
      .chart-container {
        position: relative;
        width: 100%;
      }
      .chart-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #666;
      }
      .share-btn {
        opacity: 0.8;
        transition: opacity 0.2s;
      }
      .share-btn:hover:not(:disabled) {
        opacity: 1;
      }
      .share-btn:disabled {
        opacity: 0.3;
      }
    `,
  ],
  standalone: true,
  imports: [
    MatIconButton,
    MatTooltip,
    MatIcon,
    TranslatePipe,
    MatButtonToggleGroup,
    MatButtonToggle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyChartComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) type!: ChartType;
  @Input() datasets: ChartData['datasets'] = [];
  @Input() labels?: ChartData['labels'];
  @Input() options?: ChartOptions;
  @Input() legend = true;
  @Input() height = '400px';
  @Input() shareFileName = 'chart.png';
  @Input() enableTimeframeSelector = false;

  @Output() chartClick = new EventEmitter<ChartClickEvent>();

  @ViewChild('canvas', { static: false })
  canvasRef?: ElementRef<HTMLCanvasElement>;
  private readonly chartLoaderService = inject(ChartLazyLoaderService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly shareService = inject(ShareService);
  private readonly snackService = inject(SnackService);

  isLoaded = false;
  isSharing = false;
  private chartInstance?: ChartJS;
  readonly timeframeOptions = TIMEFRAME_OPTIONS;
  private readonly datasetsSignal = signal<ChartData['datasets']>([]);
  private readonly labelsSignal = signal<ChartData['labels'] | undefined>(undefined);
  private readonly optionsSignal = signal<ChartOptions | undefined>(undefined);
  private readonly legendSignal = signal(true);
  private readonly enableSelectorSignal = signal(false);
  readonly selectedTimeframe = signal<LazyChartTimeframe>('twoWeeks');
  private readonly activeTimeframe = computed<LazyChartTimeframe>(() =>
    this.enableSelectorSignal() ? this.selectedTimeframe() : 'max',
  );
  private readonly filteredChartData = computed<ChartData<ChartType>>(() =>
    this.buildFilteredChartData(
      this.labelsSignal(),
      this.datasetsSignal(),
      this.activeTimeframe(),
    ),
  );
  private readonly resolvedChartOptions = computed<ChartOptions>(() => {
    const baseOptions = this.optionsSignal();
    const legendDisplay = this.legendSignal();
    return {
      responsive: true,
      maintainAspectRatio: false,
      ...(baseOptions ?? {}),
      plugins: {
        ...baseOptions?.plugins,
        legend: {
          display: legendDisplay,
          ...baseOptions?.plugins?.legend,
        },
      },
    };
  });
  private readonly chartOptionsWithHandlers = computed<ChartOptions>(() =>
    this.buildChartOptions(this.resolvedChartOptions(), this.optionsSignal()),
  );
  private readonly chartUpdateEffectRef: EffectRef;

  constructor() {
    this.chartUpdateEffectRef = effect(() => {
      const data = this.filteredChartData();
      const options = this.chartOptionsWithHandlers();
      if (!this.chartInstance) {
        return;
      }
      this.applyChartUpdate(data, options);
    });
  }

  async ngOnInit(): Promise<void> {
    this.datasetsSignal.set(this.datasets ?? []);
    this.labelsSignal.set(this.labels);
    this.optionsSignal.set(this.options);
    this.legendSignal.set(this.legend);
    const selectorEnabled = !!this.enableTimeframeSelector;
    this.enableSelectorSignal.set(selectorEnabled);
    this.selectedTimeframe.set(selectorEnabled ? 'twoWeeks' : 'max');

    try {
      await this.chartLoaderService.loadChartModule();
      this.isLoaded = true;
      this.cdr.markForCheck();

      // Wait for next tick to ensure canvas is rendered
      await this.waitForNextTick();
      await this.initChart();
    } catch (error) {
      console.error('Failed to load chart module:', error);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['datasets']) {
      this.datasetsSignal.set(this.datasets ?? []);
    }
    if (changes['labels']) {
      this.labelsSignal.set(this.labels);
    }
    if (changes['options']) {
      this.optionsSignal.set(this.options);
    }
    if (changes['legend']) {
      this.legendSignal.set(this.legend);
    }
    if (changes['enableTimeframeSelector']) {
      const enabledNow = !!this.enableTimeframeSelector;
      const wasEnabled = this.enableSelectorSignal();
      this.enableSelectorSignal.set(enabledNow);
      if (!wasEnabled && enabledNow) {
        this.selectedTimeframe.set('twoWeeks');
      } else if (wasEnabled && !enabledNow) {
        this.selectedTimeframe.set('max');
      }
    }
  }

  private async waitForNextTick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  private async initChart(): Promise<void> {
    if (!this.canvasRef?.nativeElement) {
      console.warn('Canvas element not available');
      return;
    }

    const chartModule = this.chartLoaderService.getChartModule();
    if (!chartModule) {
      console.error('Chart module not loaded');
      return;
    }

    const { Chart } = chartModule;

    const chartOptions = this.chartOptionsWithHandlers();
    const filteredData = this.filteredChartData();

    const chartConfig: ChartConfiguration = {
      type: this.type,
      data: filteredData,
      options: chartOptions,
    };

    try {
      this.chartInstance = new Chart(this.canvasRef.nativeElement, chartConfig);
    } catch (error) {
      console.error('Failed to initialize chart:', error);
    }
  }

  ngOnDestroy(): void {
    this.chartUpdateEffectRef.destroy();
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = undefined;
    }
  }

  onTimeframeChange(timeframe: LazyChartTimeframe): void {
    if (this.selectedTimeframe() === timeframe) {
      return;
    }
    this.selectedTimeframe.set(timeframe);
    this.cdr.markForCheck();
  }

  onTimeframeToggleChange(event: MatButtonToggleChange): void {
    const value = event.value as LazyChartTimeframe | null;
    if (!value) {
      event.source.value = this.selectedTimeframe();
      return;
    }
    this.onTimeframeChange(value);
  }

  async shareChart(): Promise<void> {
    if (!this.chartInstance?.canvas) {
      return;
    }

    this.isSharing = true;
    this.cdr.markForCheck();

    try {
      const result = await this.shareService.shareCanvasImage({
        canvas: this.chartInstance.canvas,
        filename: this.shareFileName,
        shareTitle: this.shareFileName,
        tagline: {
          text: 'With the Super Productivity App',
        },
      });

      if (result.success && result.target === 'download') {
        const message = result.path
          ? `Chart image saved to ${result.path}`
          : 'Chart image saved to device storage';
        const canOpen = this.shareService.canOpenDownloadResult(result);
        const actionConfig = canOpen
          ? {
              actionStr: T.GLOBAL_SNACK.FILE_DOWNLOADED_BTN,
              actionFn: () => {
                void this.shareService.openDownloadResult(result);
              },
            }
          : {};

        this.snackService.open({
          type: 'SUCCESS',
          msg: message,
          isSkipTranslate: true,
          ...actionConfig,
        });
      }

      if (!result.success && result.error && result.error !== 'Share cancelled') {
        console.error('Share failed:', result.error);
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      this.isSharing = false;
      this.cdr.markForCheck();
    }
  }

  private applyChartUpdate(data: ChartData<ChartType>, options: ChartOptions): void {
    if (!this.chartInstance) {
      return;
    }

    this.chartInstance.data.labels = data.labels as typeof this.chartInstance.data.labels;
    this.chartInstance.data.datasets =
      data.datasets as typeof this.chartInstance.data.datasets;
    this.chartInstance.options = this.cloneChartOptions(options);
    this.chartInstance.update();
  }

  private buildFilteredChartData(
    labels: ChartData['labels'] | undefined,
    datasets: ChartData['datasets'],
    timeframe: LazyChartTimeframe,
  ): ChartData<ChartType> {
    const limit = this.getTimeframeLimit(timeframe);
    const isArrayOfLabels = Array.isArray(labels);
    const effectiveDatasets = datasets ?? [];

    if (!isArrayOfLabels || limit === null || labels.length <= limit) {
      const clonedLabels = isArrayOfLabels
        ? (labels.slice() as ChartData['labels'])
        : labels;
      return {
        labels: clonedLabels,
        datasets: this.cloneDatasets(effectiveDatasets),
      };
    }

    const sliceStart = Math.max(labels.length - limit, 0);
    return {
      labels: labels.slice(sliceStart) as ChartData['labels'],
      datasets: this.cloneDatasets(effectiveDatasets, sliceStart),
    };
  }

  private getTimeframeLimit(timeframe: LazyChartTimeframe): number | null {
    return this.timeframeOptions.find((option) => option.id === timeframe)?.limit ?? null;
  }

  private cloneDatasets(
    datasets: ChartData['datasets'],
    sliceStart = 0,
  ): ChartData['datasets'] {
    if (!Array.isArray(datasets)) {
      return datasets;
    }

    const typedDatasets = datasets as ChartDataset<
      ChartType,
      DefaultDataPoint<ChartType>
    >[];

    return typedDatasets.map((dataset) => {
      if (!Array.isArray(dataset.data)) {
        return { ...dataset };
      }

      const typedData = dataset.data as DefaultDataPoint<ChartType>[];
      const data = sliceStart > 0 ? typedData.slice(sliceStart) : typedData.slice();

      return {
        ...dataset,
        data,
      };
    }) as ChartData['datasets'];
  }

  private buildChartOptions(
    baseOptions: ChartOptions,
    originalOptions?: ChartOptions,
  ): ChartOptions {
    const basePlugins = baseOptions.plugins ?? {};
    const legend = basePlugins.legend ? { ...basePlugins.legend } : undefined;
    const plugins = { ...basePlugins, legend };
    const optionsClone: ChartOptions = {
      ...baseOptions,
      plugins,
      onClick: (event: ChartEvent, activeElements: ActiveElement[], chart?: ChartJS) => {
        this.chartClick.emit({ active: activeElements });
        const targetChart = chart ?? this.chartInstance;
        if (targetChart) {
          originalOptions?.onClick?.(event, activeElements, targetChart);
        }
      },
    };

    return optionsClone;
  }

  private cloneChartOptions(options: ChartOptions): ChartOptions {
    const plugins = options.plugins
      ? {
          ...options.plugins,
          legend: options.plugins.legend ? { ...options.plugins.legend } : undefined,
        }
      : undefined;
    return {
      ...options,
      plugins,
    };
  }
}
