import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
  signal,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { T } from '../../../t.const';
import { SimpleCounterCopy, SimpleCounterType } from '../simple-counter.model';
import { SimpleCounterService } from '../simple-counter.service';
import { DateService } from 'src/app/core/date/date.service';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { InputDurationDirective } from '../../../ui/duration/input-duration.directive';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { ChartConfiguration } from 'chart.js';
import { LineChartData } from '../../metric/metric.model';
import { getSimpleCounterStreakDuration } from '../get-simple-counter-streak-duration';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { LazyChartComponent } from '../../metric/lazy-chart/lazy-chart.component';

const CHART_DAYS = 28;
const CHART_COLOR = '#4bc0c0';

@Component({
  selector: 'dialog-simple-counter-edit',
  templateUrl: './dialog-simple-counter-edit.component.html',
  styleUrls: ['./dialog-simple-counter-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatFormFieldModule,
    MatInputModule,
    InputDurationDirective,
    MatIcon,
    MatDialogActions,
    MatButton,
    TranslatePipe,
    LazyChartComponent,
    MsToStringPipe,
  ],
})
export class DialogSimpleCounterEditComponent {
  private readonly _dialogRef = inject(MatDialogRef<DialogSimpleCounterEditComponent>);
  private readonly _counterService = inject(SimpleCounterService);
  private readonly _dateService = inject(DateService);
  private readonly _locale = inject(LOCALE_ID);

  readonly dialogData = inject<{ simpleCounter: SimpleCounterCopy }>(MAT_DIALOG_DATA);
  readonly T = T;
  readonly SimpleCounterType = SimpleCounterType;
  readonly todayStr = this._dateService.todayStr();

  // State
  readonly localCounter = signal<SimpleCounterCopy>({
    ...this.dialogData.simpleCounter,
    countOnDay: { ...this.dialogData.simpleCounter.countOnDay },
  });

  selectedDateStr = signal(this.todayStr);

  // Computed values
  readonly selectedValue = computed(() => {
    const counter = this.localCounter();
    const date = this.selectedDateStr();
    return counter.countOnDay[date] || 0;
  });

  readonly currentStreak = computed(() =>
    getSimpleCounterStreakDuration(this.localCounter()),
  );

  readonly chartData = computed((): LineChartData => {
    const counter = this.localCounter();
    const dates = this._getChartDates();

    const values = dates.map((date) => {
      const rawValue = counter.countOnDay[date] || 0;
      return counter.type === SimpleCounterType.StopWatch
        ? Math.round(rawValue / 60000) // Convert ms to minutes for display
        : rawValue;
    });

    const labels = dates.map((date) => this._formatChartLabel(date, counter));

    return {
      labels,
      datasets: [
        {
          data: values,
          label: counter.type === SimpleCounterType.StopWatch ? 'Duration' : 'Count',
          fill: false,
          borderColor: CHART_COLOR,
        },
      ],
    };
  });

  readonly chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        ticks: { precision: 0 },
      },
    },
    onHover: (event, activeElements) => {
      const canvas = event.native?.target as HTMLCanvasElement;
      if (canvas) {
        canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      }
    },
  };

  onChartClick(event: { active: { index: number }[] }): void {
    if (!event.active?.length) return;

    const index = event.active[0].index;
    const dates = this._getChartDates();

    if (dates[index]) {
      this.selectedDateStr.set(dates[index]);
    }
  }

  updateValue(value: number): void {
    const date = this.selectedDateStr();
    this.localCounter.update((counter) => ({
      ...counter,
      countOnDay: {
        ...counter.countOnDay,
        [date]: value,
      },
    }));
  }

  save(): void {
    const localData = this.localCounter();
    const originalData = this.dialogData.simpleCounter;

    // Only save changed values
    Object.entries(localData.countOnDay).forEach(([date, value]) => {
      const originalValue = originalData.countOnDay[date] || 0;
      if (value !== originalValue) {
        this._counterService.setCounterForDate(originalData.id, date, value);
      }
    });

    this.close();
  }

  close(): void {
    this._dialogRef.close();
  }

  formatSelectedDate(): string {
    const date = this.selectedDateStr();
    if (date === this.todayStr) return 'Today';

    return new Date(date).toLocaleDateString(this._locale, {
      day: 'numeric',
      month: 'numeric',
    });
  }

  private _getChartDates(): string[] {
    const counter = this.localCounter();
    const allDates = Object.keys(counter.countOnDay).sort();

    if (!allDates.length) return [];

    // Fill in missing dates from first entry to today
    const startDate = new Date(allDates[0]);
    const endDate = new Date();
    const dates: string[] = [];

    for (const d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    // Return last 28 days
    return dates.slice(-CHART_DAYS);
  }

  private _formatChartLabel(dateStr: string, counter: SimpleCounterCopy): string {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    const baseLabel = date.toLocaleDateString(this._locale, {
      month: 'numeric',
      day: 'numeric',
    });

    if (!counter.isTrackStreaks || !counter.streakWeekDays?.[dayOfWeek]) {
      return baseLabel;
    }

    const value = counter.countOnDay[dateStr] || 0;
    const streakMet = value >= (counter.streakMinValue || 0);
    return `${baseLabel}${streakMet ? '🔥' : '❌'}`;
  }
}
