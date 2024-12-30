import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
} from '@angular/core';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { TaskDetailTargetPanel, TaskWithSubTasks } from '../tasks/task.model';
import { delay, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { TaskService } from '../tasks/task.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { slideInFromTopAni } from '../../ui/animations/slide-in-from-top.ani';
import { slideInFromRightAni } from '../../ui/animations/slide-in-from-right.ani';
import { taskDetailPanelTaskChangeAnimation } from '../tasks/task-detail-panel/task-detail-panel.ani';
import { BetterDrawerContainerComponent } from '../../ui/better-drawer/better-drawer-container/better-drawer-container.component';
import { IssuePanelComponent } from '../issue-panel/issue-panel.component';
import { NotesComponent } from '../note/notes/notes.component';
import { TaskDetailPanelComponent } from '../tasks/task-detail-panel/task-detail-panel.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    taskDetailPanelTaskChangeAnimation,
    slideInFromTopAni,
    slideInFromRightAni,
  ],
  imports: [
    BetterDrawerContainerComponent,
    IssuePanelComponent,
    NotesComponent,
    TaskDetailPanelComponent,
    AsyncPipe,
  ],
})
export class RightPanelComponent implements OnDestroy {
  taskService = inject(TaskService);
  layoutService = inject(LayoutService);

  // NOTE: used for debugging
  readonly isAlwaysOver = input<boolean>(false);

  // to still display its data when panel is closing
  selectedTaskWithDelayForNone$: Observable<TaskWithSubTasks | null> =
    this.taskService.selectedTask$.pipe(
      switchMap((task) => (task ? of(task) : of(null).pipe(delay(200)))),
    );

  panelContent$: Observable<'NOTES' | 'TASK' | 'ADD_TASK_PANEL' | undefined> =
    combineLatest([
      this.layoutService.isShowNotes$,
      this.taskService.selectedTask$,
      this.layoutService.isShowIssuePanel$,
    ]).pipe(
      map(([isShowNotes, selectedTask, isShowAddTaskPanel]) => {
        if (selectedTask) {
          return 'TASK';
        } else if (isShowNotes) {
          return 'NOTES';
        } else if (isShowAddTaskPanel) {
          return 'ADD_TASK_PANEL';
        }
        return undefined;
      }),
      distinctUntilChanged(),
    );

  isOpen$: Observable<boolean> = combineLatest([
    this.taskService.selectedTask$,
    this.taskService.taskDetailPanelTargetPanel$,
    this.layoutService.isShowNotes$,
    this.layoutService.isShowIssuePanel$,
  ]).pipe(
    map(
      ([selectedTask, targetPanel, isShowNotes, isShowAddTaskPanel]) =>
        !!(selectedTask || isShowNotes || isShowAddTaskPanel) &&
        targetPanel !== TaskDetailTargetPanel.DONT_OPEN_PANEL,
    ),
    distinctUntilChanged(),
  );

  // NOTE: prevents the inner animation from happening file panel is expanding
  isDisableTaskPanelAni = true;

  private _subs = new Subscription();

  constructor() {
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
    this.taskService.focusLastFocusedTask();
  }
}
