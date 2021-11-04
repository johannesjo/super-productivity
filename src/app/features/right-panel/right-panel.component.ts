import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TaskWithSubTasks } from '../tasks/task.model';
import { delay, switchMap } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { LayoutService } from '../../core-ui/layout/layout.service';

@Component({
  selector: 'right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RightPanelComponent {
  // NOTE: used for debugging
  @Input() isAlwaysOver: boolean = false;

  // to still display its data when panel is closing
  selectedTaskWithDelayForNone$: Observable<TaskWithSubTasks | null> =
    this.taskService.selectedTask$.pipe(
      switchMap((task) => (task ? of(task) : of(null).pipe(delay(200)))),
    );

  constructor(public taskService: TaskService, public layoutService: LayoutService) {}
}
