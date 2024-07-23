import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiModule } from '../../../ui/ui.module';

const FH = 12;
const D_HOURS = 24;

@Component({
  selector: 'schedule',
  standalone: true,
  imports: [UiModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent {
  FH = FH;
  daysToShow = 7;
  colByNr = Array.from({ length: this.daysToShow }, (_, index) => index);
  rowsByNr = Array.from({ length: D_HOURS * FH }, (_, index) => index);

  times: string[] = this.rowsByNr.map((_, index) => {
    if (index % FH === 0) {
      return (index / FH).toString() + ':00';
    } else {
      // eslint-disable-next-line no-mixed-operators
      // return '  :' + (index % FH) * 5;
      return '';
    }

    // const hours = Math.floor(index / 2);
    // const minutes = index % 2 === 0 ? '00' : '30';
    // return `${hours}:${minutes}`;
  });

  events = [
    {
      title: 'Something',
      col: 2,
      row: 4,
      span: 2,
    },
  ];
}
