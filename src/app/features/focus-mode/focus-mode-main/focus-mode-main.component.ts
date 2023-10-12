import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { TaskCopy } from '../../tasks/task.model';
import { Subject } from 'rxjs';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { Router } from '@angular/router';
import { first, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'focus-mode-main',
  templateUrl: './focus-mode-main.component.html',
  styleUrls: ['./focus-mode-main.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
})
export class FocusModeMainComponent implements OnDestroy {
  @Input() focusModeDuration = 25 * 60 * 1000;
  @Input() focusModeElapsed = 0;
  @Output() taskDone: EventEmitter<void> = new EventEmitter();
  task: TaskCopy | null = null;
  isFocusNotes = false;
  isShowNotes = false;
  // defaultTaskNotes: string = '';
  defaultTaskNotes: string = '';
  _onDestroy$ = new Subject<void>();

  constructor(
    private readonly _globalConfigService: GlobalConfigService,
    public readonly taskService: TaskService,
    public readonly layoutService: LayoutService,
    private _router: Router,
  ) {
    this._globalConfigService.misc$
      .pipe(takeUntil(this._onDestroy$))
      .subscribe((misc) => (this.defaultTaskNotes = misc.taskNotesTpl));
    this.taskService.currentTask$.pipe(takeUntil(this._onDestroy$)).subscribe((task) => {
      this.task = task;
    });

    this.taskService.currentTask$
      .pipe(first(), takeUntil(this._onDestroy$))
      .subscribe((task) => {
        if (!task) {
          this.taskService.startFirstStartable();
        }
      });
  }

  get focusRemaining(): number {
    return Math.round((this.focusModeDuration - this.focusModeElapsed) / 1000 / 60);
  }

  get focusSessionProgress(): number {
    return (this.focusModeElapsed * 100) / this.focusModeDuration;
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }

  changeTaskNotes($event: string): void {
    if (
      !this.defaultTaskNotes ||
      !$event ||
      $event.trim() !== this.defaultTaskNotes.trim()
    ) {
      if (this.task === null) {
        throw new Error('Task is not loaded');
      }
      this.taskService.update(this.task.id, { notes: $event });
    }
  }

  finishCurrentTask(): void {
    this.taskDone.emit();
  }

  getProcrastinationHelp(): void {
    this.layoutService.hideFocusModeOverlay();
    this._router.navigateByUrl('/procrastination');
  }

  toggleNotes(): void {}
}
