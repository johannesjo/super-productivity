import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
import { MatFormField, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { InputDurationDirective } from '../../../ui/duration/input-duration.directive';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { LineChartData } from '../../metric/metric.model';

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
  ],
})
export class DialogSimpleCounterEditComponent {
  private _matDialogRef =
    inject<MatDialogRef<DialogSimpleCounterEditComponent>>(MatDialogRef);
  private _simpleCounterService = inject(SimpleCounterService);
  private _dateService = inject(DateService);

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
      labels,
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
