import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { GlobalConfigService } from 'src/app/features/config/global-config.service';
import { T } from 'src/app/t.const';
import { DEFAULT_DAY_START } from '../../features/config/default-global-config.const';

@Component({
  selector: 'owl-wrapper',
  templateUrl: './owl-wrapper.component.html',
  styleUrls: ['./owl-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwlWrapperComponent {
  @Input() now: Date = new Date();

  @Input() model?: number;

  dateTime?: number;

  @Output()
  dateTimeChange: EventEmitter<number> = new EventEmitter();

  @Output()
  triggerSubmit: EventEmitter<number> = new EventEmitter();
  T: typeof T = T;

  date?: Date;

  laterTodaySlots: string[] = [
    DEFAULT_DAY_START,
    '15:00',
    '17:00',
    '19:00',
    '21:00',
    '22:00',
    '23:30',
  ];

  firstDayOfWeek$: Observable<number> = this._globalConfigService.misc$.pipe(
    map((cfg) => cfg.firstDayOfWeek),
    startWith(0),
  );

  constructor(private _globalConfigService: GlobalConfigService) {}

  @Input('dateTime')
  set dateTimeSet(v: number) {
    this.dateTime = v;
    if (v) {
      // NOTE: owl doesn't with undefined...
      this.date = new Date(v);
    }
  }

  submit() {
    this.triggerSubmit.emit(this.dateTime);
  }

  updateDateFromCal(date: any) {
    this.dateTime = new Date(date).getTime();
    this.dateTimeChange.emit(this.dateTime);
  }
}
