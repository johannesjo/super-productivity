import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostBinding,
  HostListener,
  inject,
  OnDestroy,
} from '@angular/core';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { TaskCopy } from '../../tasks/task.model';
import { from, Observable, of, Subject } from 'rxjs';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { first, switchMap, take, takeUntil } from 'rxjs/operators';
import { TaskAttachmentService } from '../../tasks/task-attachment/task-attachment.service';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { IssueService } from '../../issue/issue.service';
import { Store } from '@ngrx/store';
import {
  completeTask,
  selectFocusTask,
  setFocusSessionDuration,
} from '../store/focus-mode.actions';
import { selectTimeDuration } from '../store/focus-mode.selectors';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { SimpleCounterService } from '../../simple-counter/simple-counter.service';
import { SimpleCounter } from '../../simple-counter/simple-counter.model';
import { ICAL_TYPE } from '../../issue/issue.const';
import { TaskTitleComponent } from '../../../ui/task-title/task-title.component';
import { ProgressCircleComponent } from '../../../ui/progress-circle/progress-circle.component';
import { MatIconAnchor, MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { InlineMarkdownComponent } from '../../../ui/inline-markdown/inline-markdown.component';
import { AsyncPipe } from '@angular/common';
import { MsToMinuteClockStringPipe } from '../../../ui/duration/ms-to-minute-clock-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { IssueIconPipe } from '../../issue/issue-icon/issue-icon.pipe';
import { SimpleCounterButtonComponent } from '../../simple-counter/simple-counter-button/simple-counter-button.component';
import { TaskAttachmentListComponent } from '../../tasks/task-attachment/task-attachment-list/task-attachment-list.component';
import { slideInOutFromBottomAni } from '../../../ui/animations/slide-in-out-from-bottom.ani';
import { FocusModeService } from '../focus-mode.service';
import { BreathingDotComponent } from '../../../ui/breathing-dot/breathing-dot.component';

@Component({
  selector: 'focus-mode-main',
  templateUrl: './focus-mode-main.component.html',
  styleUrls: ['./focus-mode-main.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation, slideInOutFromBottomAni],
  imports: [
    TaskTitleComponent,
    ProgressCircleComponent,
    BreathingDotComponent,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatIconAnchor,
    InlineMarkdownComponent,
    TaskAttachmentListComponent,
    AsyncPipe,
    MsToMinuteClockStringPipe,
    TranslatePipe,
    IssueIconPipe,
    SimpleCounterButtonComponent,
    MatMiniFabButton,
  ],
})
export class FocusModeMainComponent implements OnDestroy {
  readonly simpleCounterService = inject(SimpleCounterService);
  private readonly _globalConfigService = inject(GlobalConfigService);
  readonly taskService = inject(TaskService);
  private readonly _taskAttachmentService = inject(TaskAttachmentService);
  private readonly _issueService = inject(IssueService);
  private readonly _store = inject(Store);

  focusModeService = inject(FocusModeService);

  timeElapsed = this.focusModeService.timeElapsed;
  isCountTimeDown = this.focusModeService.isCountTimeDown;

  @HostBinding('class.isShowNotes') isShowNotes: boolean = false;

  task: TaskCopy | null = null;
  isFocusNotes = false;
  isDragOver: boolean = false;

  // defaultTaskNotes: string = '';
  defaultTaskNotes: string = '';
  T: typeof T = T;
  issueUrl$: Observable<string | null> = this.taskService.currentTask$.pipe(
    switchMap((v) => {
      if (!v) {
        return of(null);
      }
      return v.issueType && v.issueId && v.issueProviderId
        ? from(this._issueService.issueLink(v.issueType, v.issueId, v.issueProviderId))
        : of(null);
    }),
    take(1),
  );

  private _onDestroy$ = new Subject<void>();
  private _dragEnterTarget?: HTMLElement;

  constructor() {
    // Use effect to reactively update defaultTaskNotes
    effect(() => {
      const misc = this._globalConfigService.misc();
      if (misc) {
        this.defaultTaskNotes = misc.taskNotesTpl;
      }
    });
    this.taskService.currentTask$.pipe(takeUntil(this._onDestroy$)).subscribe((task) => {
      this.task = task;
      if (!task) {
        this._store.dispatch(selectFocusTask());
      }
    });
  }

  @HostListener('dragenter', ['$event']) onDragEnter(ev: DragEvent): void {
    this._dragEnterTarget = ev.target as HTMLElement;
    ev.preventDefault();
    ev.stopPropagation();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(ev: DragEvent): void {
    if (this._dragEnterTarget === (ev.target as HTMLElement)) {
      ev.preventDefault();
      ev.stopPropagation();
      this.isDragOver = false;
    }
  }

  @HostListener('drop', ['$event']) onDrop(ev: DragEvent): void {
    if (!this.task) {
      return;
    }
    this._taskAttachmentService.createFromDrop(ev, this.task.id);
    ev.stopPropagation();
    this.isDragOver = false;
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
    this._store.dispatch(completeTask());
    // always go to task selection afterward
    this._store.dispatch(selectFocusTask());

    const id = this.task && this.task.id;
    if (id) {
      this._store.dispatch(
        TaskSharedActions.updateTask({
          task: {
            id,
            changes: {
              isDone: true,
              doneOn: Date.now(),
            },
          },
        }),
      );
    }
  }

  trackById(i: number, item: SimpleCounter): string {
    return item.id;
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string): void {
    if (isChanged) {
      if (!this.task) {
        throw new Error('No task data');
      }
      this.taskService.update(this.task.id, { title: newTitle });
    }
  }

  extendSession(): void {
    this._store
      .select(selectTimeDuration)
      .pipe(first())
      .subscribe((currentDuration) => {
        const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
        const extendedDuration = currentDuration + fiveMinutesInMs;
        this._store.dispatch(
          setFocusSessionDuration({ focusSessionDuration: extendedDuration }),
        );
      });
  }

  protected readonly ICAL_TYPE = ICAL_TYPE;
}
