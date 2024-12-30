import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { T } from 'src/app/t.const';
import { AddTaskBarComponent } from '../../tasks/add-task-bar/add-task-bar.component';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'add-task-inline',
  imports: [AddTaskBarComponent, MatIcon, TranslatePipe],
  templateUrl: './add-task-inline.component.html',
  styleUrl: './add-task-inline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskInlineComponent {
  T: typeof T = T;

  readonly planForDay = input<string>();

  isShowAddTask = false;
}
