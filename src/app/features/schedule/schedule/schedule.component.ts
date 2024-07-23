import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiModule } from '../../../ui/ui.module';

@Component({
  selector: 'schedule',
  standalone: true,
  imports: [UiModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent {
  hourFraction = 1;
  numberOfRows = 24;
  daysToShow = 7;
  colByNr = Array.from({ length: this.daysToShow }, (_, index) => index);
  rowsByNr = Array.from({ length: this.numberOfRows }, (_, index) => index);
  times: string[] = this.rowsByNr.map((_, index) => {
    // const hours = Math.floor(index / 2);
    // const minutes = index % 2 === 0 ? '00' : '30';
    // return `${hours}:${minutes}`;
    return index.toString() + ':00';
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
