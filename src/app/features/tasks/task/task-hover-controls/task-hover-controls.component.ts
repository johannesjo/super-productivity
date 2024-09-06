import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Inject,
  input,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TaskWithSubTasks } from '../../task.model';
import { TODAY_TAG } from '../../../tag/tag.const';
import { T } from 'src/app/t.const';
import { IS_TOUCH_PRIMARY } from 'src/app/util/is-mouse-primary';
import { TaskComponent } from '../task.component';
import { TranslateModule } from '@ngx-translate/core';
import { UiModule } from '../../../../ui/ui.module';
import { KeyboardConfig } from '../../../config/keyboard-config.model';

@Component({
  selector: 'task-hover-controls',
  standalone: true,
  imports: [NgIf, MatIcon, TranslateModule, UiModule],
  templateUrl: './task-hover-controls.component.html',
  styleUrl: './task-hover-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskHoverControlsComponent {
  task = input.required<TaskWithSubTasks>();
  isCurrent = input.required<boolean>();
  isSelected = input.required<boolean>();
  isShowAddToToday = input.required<boolean>();
  isBacklog = input<boolean>(false);
  isInSubTaskList = input<boolean>(false);

  isTodayTag = computed(() => this.task().tagIds.includes(TODAY_TAG.id));
  isShowRemoveFromToday = computed(() => {
    const t = this.task();
    return !!(
      !t.isDone &&
      this.isTodayTag() &&
      (t.projectId || t.tagIds?.length > 1 || t.parentId)
    );
  });

  T: typeof T = T;
  IS_TOUCH_PRIMARY: boolean = IS_TOUCH_PRIMARY;

  constructor(@Inject(TaskComponent) public parent: TaskComponent) {}

  get kb(): KeyboardConfig {
    return this.parent.kb;
  }
}
