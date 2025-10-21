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
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

interface ChartClickEvent {
  active: ActiveElement[];
}

@Component({
  selector: 'lazy-chart',
  template: `
    <div class="chart-wrapper">
      <button
        mat-icon-button
        class="share-btn"
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
      .share-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        opacity: 0.6;
        transition: opacity 0.2s;
        z-index: 10;
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
  imports: [CommonModule, MatIconButton, MatTooltip, MatIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyChartComponent implements OnInit, OnDestroy {
  @Input({ required: true }) type!: ChartType;
  @Input() datasets: ChartData['datasets'] = [];
  @Input() labels?: ChartData['labels'];
  @Input() options?: ChartOptions;
  @Input() legend = true;
  @Input() height = '400px';
  @Input() shareFileName = 'chart.png';

  @Output() chartClick = new EventEmitter<ChartClickEvent>();

  @ViewChild('canvas', { static: false })
  canvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly chartLoaderService = inject(ChartLazyLoaderService);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoaded = false;
  isSharing = false;
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

  async shareChart(): Promise<void> {
    if (!this.chartInstance?.canvas) {
      return;
    }

    this.isSharing = true;
    this.cdr.markForCheck();

    try {
      const decoratedCanvas = this._createCanvasWithTagline(this.chartInstance.canvas);

      const blob: Blob | null = await new Promise((resolve) => {
        decoratedCanvas.toBlob((b) => resolve(b), 'image/png', 1.0);
      });

      if (!blob) {
        throw new Error('Failed to export chart');
      }

      const filename = this.shareFileName?.trim() || 'chart.png';
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
      } else {
        this._downloadFile(blob, filename);
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      this.isSharing = false;
      this.cdr.markForCheck();
    }
  }

  private _createCanvasWithTagline(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const taglineHeight = 48;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = sourceCanvas.width;
    newCanvas.height = sourceCanvas.height + taglineHeight;

    const ctx = newCanvas.getContext('2d');
    if (!ctx) {
      return sourceCanvas;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);

    const shareLabel = `With the Super Productivity App`;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';

    const baseFontSize = Math.max(20, Math.round(newCanvas.width / 40));
    ctx.font = `${baseFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const taglineOffset = taglineHeight / 2;
    const taglineY = sourceCanvas.height + taglineOffset;
    ctx.fillText(shareLabel, newCanvas.width / 2, taglineY);

    return newCanvas;
  }

  private _downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
