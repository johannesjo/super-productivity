import { ChangeDetectionStrategy, Component, Input, OnDestroy } from '@angular/core';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { TaskWithSubTasks } from '../tasks/task.model';
import { delay, map, switchMap } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { slideInFromTopAni } from '../../ui/animations/slide-in-from-top.ani';
import { slideInFromRightAni } from '../../ui/animations/slide-in-from-right.ani';
import { taskAdditionalInfoTaskChangeAnimation } from '../tasks/task-additional-info/task-additional-info.ani';

@Component({
  selector: 'right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    taskAdditionalInfoTaskChangeAnimation,
    slideInFromTopAni,
    slideInFromRightAni,
  ],
})
export class RightPanelComponent implements OnDestroy {
  // NOTE: used for debugging
  @Input() isAlwaysOver: boolean = false;

  // to still display its data when panel is closing
  selectedTaskWithDelayForNone$: Observable<TaskWithSubTasks | null> =
    this.taskService.selectedTask$.pipe(
      switchMap((task) => (task ? of(task) : of(null).pipe(delay(200)))),
    );

  isOpen$: Observable<boolean> = combineLatest([
    this.taskService.selectedTask$,
    this.layoutService.isShowNotes$,
  ]).pipe(map(([selectedTask, isShowNotes]) => !!(selectedTask || isShowNotes)));

  // NOTE: prevents the inner animation from happening file panel is expanding
  isDisableTaskPanelAni = true;

  private _subs = new Subscription();

  constructor(
    public taskService: TaskService,
    public layoutService: LayoutService,
  ) {
    this._subs.add(
      this.isOpen$.subscribe((isOpen) => {
        if (!isOpen) {
          this.onClose();
        }
      }),
    );
    this._subs.add(
      // NOTE: delay is needed, because otherwise timing won't work
      this.isOpen$.pipe(delay(500)).subscribe((isOpen) => {
        this.isDisableTaskPanelAni = !isOpen;
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  close(): void {
    this.taskService.setSelectedId(null);
    this.layoutService.hideNotes();
    this.onClose();
  }

  onClose(): void {
    this.taskService.focusFirstTaskIfVisible();
  }
}
