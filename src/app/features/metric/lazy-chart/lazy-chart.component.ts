import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import type {
  ChartType,
  ChartData,
  ChartOptions,
  ActiveElement,
  ChartEvent,
  Chart as ChartJS,
  ChartConfiguration,
} from 'chart.js';
import { CommonModule } from '@angular/common';
import { ChartLazyLoaderService } from '../chart-lazy-loader.service';

interface ChartClickEvent {
  active: ActiveElement[];
}

@Component({
  selector: 'lazy-chart',
  template: `
    <div class="chart-wrapper">
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
    `,
  ],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyChartComponent implements OnInit, OnDestroy {
  @Input({ required: true }) type!: ChartType;
  @Input() datasets: ChartData['datasets'] = [];
  @Input() labels?: ChartData['labels'];
  @Input() options?: ChartOptions;
  @Input() legend = true;
  @Input() height = '400px';

  @Output() chartClick = new EventEmitter<ChartClickEvent>();

  @ViewChild('canvas', { static: false })
  canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly chartLoaderService = inject(ChartLazyLoaderService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoaded = false;
  private chartInstance?: ChartJS;

  async ngOnInit(): Promise<void> {
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

    const chartOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      ...this.options,
      plugins: {
        ...this.options?.plugins,
        legend: {
          display: this.legend,
          ...this.options?.plugins?.legend,
        },
      },
      onClick: (event: ChartEvent, activeElements: ActiveElement[]) => {
        this.chartClick.emit({ active: activeElements });
      },
    };

    const chartConfig: ChartConfiguration = {
      type: this.type,
      data: {
        labels: this.labels,
        datasets: this.datasets,
      },
      options: chartOptions,
    };

    try {
      this.chartInstance = new Chart(this.canvasRef.nativeElement, chartConfig);
    } catch (error) {
      console.error('Failed to initialize chart:', error);
    }
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = undefined;
    }
  }
}
