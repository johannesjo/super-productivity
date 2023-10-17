import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { TaskCopy } from '../../tasks/task.model';
import { Observable, of, Subject } from 'rxjs';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { Router } from '@angular/router';
import { first, switchMap, take, takeUntil } from 'rxjs/operators';
import { TaskAttachmentService } from '../../tasks/task-attachment/task-attachment.service';
import { T } from 'src/app/t.const';
import { FocusModeService } from '../focus-mode.service';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { IssueService } from '../../issue/issue.service';

@Component({
  selector: 'focus-mode-main',
  templateUrl: './focus-mode-main.component.html',
  styleUrls: ['./focus-mode-main.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation],
})
export class FocusModeMainComponent implements OnDestroy {
  @Input() focusModeDuration = 25 * 60 * 1000;
  @Input() focusModeTimeToGo = 0;
  @Input() sessionProgress = 0;
  @Output() taskDone: EventEmitter<string> = new EventEmitter();
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
      return v.issueType && v.issueId && v.projectId
        ? this._issueService.issueLink$(v.issueType, v.issueId, v.projectId)
        : of(null);
    }),
    take(1),
  );

  private _onDestroy$ = new Subject<void>();
  private _dragEnterTarget?: HTMLElement;

  constructor(
    private readonly _globalConfigService: GlobalConfigService,
    public readonly taskService: TaskService,
    public readonly focusModeService: FocusModeService,
    private _router: Router,
    private _taskAttachmentService: TaskAttachmentService,
    private _issueService: IssueService,
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

  get focusSessionProgress(): number {
    return (this.focusModeTimeToGo * 100) / this.focusModeDuration;
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
    this.taskDone.emit(this.task?.id);
  }

  getProcrastinationHelp(): void {
    this.focusModeService.hideFocusOverlay();
    this._router.navigateByUrl('/procrastination');
  }

  toggleNotes(): void {}
}
