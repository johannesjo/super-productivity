import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
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
import { ChartConfiguration } from 'chart.js';
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

  stats = computed(() => {
    const countOnDay = this.data.simpleCounter.countOnDay;
    let labels = sortWorklogDates(Object.keys(countOnDay));
    labels = this._fillMissingDates(labels);

    labels = labels.slice(-28);

    const data =
      this.data.simpleCounter.type === SimpleCounterType.StopWatch
        ? labels.map((date) => Math.round(countOnDay[date] / 60000))
        : labels.map((date) => countOnDay[date]);

    const chartData: LineChartData = {
      labels: labels.map((dateStr) => {
        const d = new Date(dateStr);
        const isStreakDay = this.data.simpleCounter.streakWeekDays?.[d.getDay()];
        const isStreakFulfilled =
          countOnDay[dateStr] >= (this.data.simpleCounter.streakMinValue || 0);

        return `${d.toLocaleDateString(this._locale, {
          month: 'numeric',
          day: 'numeric',
        })}${isStreakDay ? (isStreakFulfilled ? '🔥' : '❌') : ''}`;
      }),
      datasets: [
        {
          data,
          label:
            this.data.simpleCounter.type === SimpleCounterType.StopWatch
              ? 'Duration'
              : 'Count',
          fill: false,
          borderColor: '#4bc0c0',
        },
      ],
    };
    return chartData;
  });

  currentStreak = computed(() => {
    return getSimpleCounterStreakDuration(this.data.simpleCounter);
  });

  T: typeof T = T;
  SimpleCounterType: typeof SimpleCounterType = SimpleCounterType;

  todayStr: string = this._dateService.todayStr();
  val: number = this.data.simpleCounter.countOnDay[this.todayStr];
  lineChartOptions: ChartConfiguration<
    'line',
    (number | undefined)[],
    string
  >['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: {
          precision: 0,
        },
      },
    },
  };

  submit(): void {
    this._simpleCounterService.setCounterToday(this.data.simpleCounter.id, this.val);
    this.close();
  }

  onModelChange($event: number): void {
    this.val = $event;
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
