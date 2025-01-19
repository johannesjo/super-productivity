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
import { DurationToStringPipe } from '../../../ui/duration/duration-to-string.pipe';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';

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
    DurationToStringPipe,
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
    const labels = Object.keys(countOnDay);

    const data =
      this.data.simpleCounter.type === SimpleCounterType.StopWatch
        ? labels.map((date) => Math.round(countOnDay[date] / 60000))
        : labels.map((date) => countOnDay[date]);

    const chartData: LineChartData = {
      labels: labels.map(
        (date) =>
          `${new Date(date).toLocaleDateString(this._locale, {
            month: 'numeric',
            day: 'numeric',
          })}`,
      ),
      datasets: [
        {
          data,
          label: 'Count',
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
}
