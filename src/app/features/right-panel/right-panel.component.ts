import { ChangeDetectionStrategy, Component, Input, OnDestroy } from '@angular/core';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { TaskWithSubTasks } from '../tasks/task.model';
import { delay, map, switchMap } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { slideInFromTopAni } from '../../ui/animations/slide-in-from-top.ani';
import { slideAdditionalInfoInFromLeftAni } from './slide-additional-info-in-from-left.ani';
import { slideInFromRightAni } from '../../ui/animations/slide-in-from-right.ani';

@Component({
  selector: 'right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideAdditionalInfoInFromLeftAni, slideInFromTopAni, slideInFromRightAni],
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

  private _subs = new Subscription();

  constructor(public taskService: TaskService, public layoutService: LayoutService) {
    this._subs.add(
      this.isOpen$.subscribe((isOpen) => {
        if (!isOpen) {
          this.onClose();
        }
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
