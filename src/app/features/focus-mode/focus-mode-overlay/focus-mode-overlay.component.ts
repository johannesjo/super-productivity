import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { TaskService } from '../../tasks/task.service';
import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { GlobalConfigService } from '../../config/global-config.service';
import { Router } from '@angular/router';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { FocusModePage } from '../focus-mode.const';
import { FocusModeService } from '../focus-mode.service';

@Component({
  selector: 'focus-mode-overlay',
  templateUrl: './focus-mode-overlay.component.html',
  styleUrls: ['./focus-mode-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class FocusModeOverlayComponent implements OnDestroy {
  _onDestroy$ = new Subject<void>();
  activePage: FocusModePage | undefined;
  FocusModePage: typeof FocusModePage = FocusModePage;
  focusModeElapsed: number = 60 * 12 * 1000;

  constructor(
    private readonly _globalConfigService: GlobalConfigService,
    public readonly taskService: TaskService,
    public readonly focusModeService: FocusModeService,
    private _router: Router,
  ) {
    // TODO this needs to work differently
    this.taskService.currentTask$
      .pipe(first(), takeUntil(this._onDestroy$))
      .subscribe((task) => {
        if (!task) {
          // this.taskService.startFirstStartable();
          // this.activePage = FocusModePage.Main;
          this.activePage = FocusModePage.TaskSelection;
        } else {
          this.activePage = FocusModePage.DurationSelection;
        }
      });
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }

  onTaskDone(): void {
    this.activePage = FocusModePage.TaskDone;
  }

  onTaskSelected(task: Task | string): void {
    console.log({ task });

    if (typeof task === 'string') {
      // TODO create task
    } else {
      this.activePage = FocusModePage.DurationSelection;
    }
  }

  onFocusModeDurationSelected(duration: number): void {
    this.focusModeService.setFocusSessionDuration(duration);
    this.activePage = FocusModePage.Main;
  }

  cancelFocusSession(): void {
    this.taskService.setCurrentId(null);
    this.focusModeService.hideFocusOverlay();
  }
}
