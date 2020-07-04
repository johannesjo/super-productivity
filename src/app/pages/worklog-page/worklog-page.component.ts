import { ChangeDetectionStrategy, Component } from '@angular/core';
import { T } from '../../t.const';

@Component({
  selector: 'worklog-page',
  templateUrl: './worklog-page.component.html',
  styleUrls: ['./worklog-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorklogPageComponent {
  // tslint:disable-next-line:typedef
  T = T;

  constructor() {
  }
}
