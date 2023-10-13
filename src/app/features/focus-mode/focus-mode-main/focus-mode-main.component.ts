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
import { Subject } from 'rxjs';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { Router } from '@angular/router';
import { first, takeUntil } from 'rxjs/operators';
import { TaskAttachmentService } from '../../tasks/task-attachment/task-attachment.service';
import { T } from 'src/app/t.const';
import { FocusModeService } from '../focus-mode.service';
import { fadeAnimation } from '../../../ui/animations/fade.ani';

@Component({
  selector: 'focus-mode-main',
  templateUrl: './focus-mode-main.component.html',
  styleUrls: ['./focus-mode-main.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, fadeAnimation],
})
export class FocusModeMainComponent implements OnDestroy {
  @Input() focusModeDuration = 25 * 60 * 1000;
  @Input() focusModeElapsed = 0;
  @Output() taskDone: EventEmitter<void> = new EventEmitter();
  @HostBinding('class.isShowNotes') isShowNotes: boolean = true;

  task: TaskCopy | null = null;
  isFocusNotes = false;
  isDragOver: boolean = false;

  // defaultTaskNotes: string = '';
  defaultTaskNotes: string = '';
  T: typeof T = T;

  private _onDestroy$ = new Subject<void>();
  private _dragEnterTarget?: HTMLElement;

  constructor(
    private readonly _globalConfigService: GlobalConfigService,
    public readonly taskService: TaskService,
    public readonly layoutService: LayoutService,
    public readonly focusModeService: FocusModeService,
    private _router: Router,
    private _taskAttachmentService: TaskAttachmentService,
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
