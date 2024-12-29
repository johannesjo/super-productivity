import { ChangeDetectionStrategy, Component, Inject, input } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { TaskWithSubTasks } from '../../task.model';
import { T } from 'src/app/t.const';
import { IS_TOUCH_PRIMARY } from 'src/app/util/is-mouse-primary';
import { TaskComponent } from '../task.component';
import { TranslateModule } from '@ngx-translate/core';
import { UiModule } from '../../../../ui/ui.module';
import { KeyboardConfig } from '../../../config/keyboard-config.model';
import { ICAL_TYPE } from '../../../issue/issue.const';

@Component({
  selector: 'task-hover-controls',
  imports: [MatIcon, TranslateModule, UiModule],
  templateUrl: './task-hover-controls.component.html',
  styleUrl: './task-hover-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskHoverControlsComponent {
  task = input.required<TaskWithSubTasks>();
  isCurrent = input.required<boolean>();
  isSelected = input.required<boolean>();
  isShowAddToToday = input.required<boolean>();
  isShowRemoveFromToday = input.required<boolean>();
  isBacklog = input<boolean>(false);
  isInSubTaskList = input<boolean>(false);

  T: typeof T = T;
  IS_TOUCH_PRIMARY: boolean = IS_TOUCH_PRIMARY;

  constructor(@Inject(TaskComponent) public parent: TaskComponent) {}

  get kb(): KeyboardConfig {
    return this.parent.kb;
  }

  protected readonly ICAL_TYPE = ICAL_TYPE;
}
