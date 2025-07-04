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
import {
  MatFormField,
  MatFormFieldModule,
  MatPrefix,
} from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { InputDurationDirective } from '../../../ui/duration/input-duration.directive';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartEvent, ActiveElement } from 'chart.js';
import { LineChartData } from '../../metric/metric.model';
import { getSimpleCounterStreakDuration } from '../get-simple-counter-streak-duration';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { sortWorklogDates } from '../../../util/sortWorklogDates';

@Component({
  selector: 'dialog-simple-counter-edit',
  templateUrl: './dialog-simple-counter-edit.component.html',
  styleUrls: ['./dialog-simple-counter-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatFormField,
    MatInput,
    InputDurationDirective,
    MatIcon,
    MatPrefix,
    MatDialogActions,
    MatButton,
    TranslatePipe,
    BaseChartDirective,
    MatFormFieldModule,
    MatInputModule,
    MsToStringPipe,
  ],
})
export class DialogSimpleCounterEditComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogSimpleCounterEditComponent>>(MatDialogRef);
  private _simpleCounterService = inject(SimpleCounterService);
  private _dateService = inject(DateService);
  private _locale = inject(LOCALE_ID);

  data = inject<{
    simpleCounter: SimpleCounterCopy;
  }>(MAT_DIALOG_DATA);

  // Create a local copy that updates immediately using a signal
  localCounterData = signal<SimpleCounterCopy>({
    ...this.data.simpleCounter,
    countOnDay: { ...this.data.simpleCounter.countOnDay },
  });

  stats = computed(() => {
    // Use local data for immediate updates
    const localData = this.localCounterData();
    const countOnDay = localData.countOnDay;
    let labels = sortWorklogDates(Object.keys(countOnDay));
    labels = this._fillMissingDates(labels);

    labels = labels.slice(-28);

    const data = labels.map((date) => {
      const rawVal = countOnDay[date] ?? 0;
      return localData.type === SimpleCounterType.StopWatch
        ? Math.round(rawVal / 60000)
        : rawVal;
    });

    const chartData: LineChartData = {
      labels: labels.map((dateStr) => {
        const d = new Date(dateStr);
        const isStreakDay = localData.streakWeekDays?.[d.getDay()];
        const isStreakFulfilled = countOnDay[dateStr] >= (localData.streakMinValue || 0);

        return `${d.toLocaleDateString(this._locale, {
          month: 'numeric',
          day: 'numeric',
        })}${isStreakDay ? (isStreakFulfilled ? '🔥' : '❌') : ''}`;
      }),
      datasets: [
        {
          data,
          label: localData.type === SimpleCounterType.StopWatch ? 'Duration' : 'Count',
          fill: false,
          borderColor: '#4bc0c0',
        },
      ],
    };
    return chartData;
  });

  currentStreak = computed(() => {
    return getSimpleCounterStreakDuration(this.localCounterData());
  });

  T: typeof T = T;
  SimpleCounterType: typeof SimpleCounterType = SimpleCounterType;

  todayStr: string = this._dateService.todayStr();
  selectedDateStr: string = this.todayStr;
  val: number = this.localCounterData().countOnDay[this.selectedDateStr] || 0;
  lineChartOptions: ChartConfiguration<
    'line',
    (number | undefined)[],
    string
  >['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        ticks: {
          precision: 0,
        },
      },
    },
    onHover: (event, activeElements) => {
      const canvas = event.native?.target as HTMLCanvasElement;
      if (canvas) {
        canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      }
    },
  };

  onChartClick(event: { event?: ChartEvent; active?: ActiveElement[] }): void {
    if (event.active && event.active.length > 0) {
      const chartElement = event.active[0];
      const index = chartElement.index;
      const fullDates = this._getLast28Dates();
      if (index >= 0 && index < fullDates.length) {
        this.selectedDateStr = fullDates[index];
        this.val = this.localCounterData().countOnDay[this.selectedDateStr] || 0;
      }
    }
  }

  private _getLast28Dates(): string[] {
    let labels = sortWorklogDates(Object.keys(this.localCounterData().countOnDay));
    labels = this._fillMissingDates(labels);
    return labels.slice(-28);
  }

  formatSelectedDate(): string {
    if (this.selectedDateStr === this._dateService.todayStr()) {
      return 'Today';
    }
    const d = new Date(this.selectedDateStr);
    return d.toLocaleDateString(this._locale, { day: 'numeric', month: 'numeric' });
  }

  submit(): void {
    // Save all local changes
    const localData = this.localCounterData();
    Object.keys(localData.countOnDay).forEach((dateStr) => {
      const localValue = localData.countOnDay[dateStr];
      const originalValue = this.data.simpleCounter.countOnDay[dateStr] || 0;
      if (localValue !== originalValue) {
        this._simpleCounterService.setCounterForDate(
          this.data.simpleCounter.id,
          dateStr,
          localValue,
        );
      }
    });
    this.close();
  }

  onModelChange($event: number): void {
    this.val = $event;
    // Update local data immediately
    this.localCounterData.update((current) => ({
      ...current,
      countOnDay: {
        ...current.countOnDay,
        [this.selectedDateStr]: $event,
      },
    }));
  }

  close(): void {
    this._matDialogRef.close();
  }

  private _fillMissingDates(dates: string[]): string[] {
    const startDate = new Date(dates[0]);
    // const endDate = new Date(dates[dates.length - 1]);
    const endDate = new Date();

    const filledDates: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      filledDates.push(dateStr);
    }

    return filledDates;
  }
}
