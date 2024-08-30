import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { IssueModule } from '../../../issue/issue.module';
import { MatIcon } from '@angular/material/icon';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { TaskCopy, TaskWithSubTasks } from '../../task.model';
import { EMPTY, forkJoin, Observable, of, ReplaySubject, Subject } from 'rxjs';
import {
  concatMap,
  distinctUntilChanged,
  first,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { Project } from '../../../project/project.model';
import { TaskService } from '../../task.service';
import { TaskRepeatCfgService } from '../../../task-repeat-cfg/task-repeat-cfg.service';
import { MatDialog } from '@angular/material/dialog';
import { IssueService } from '../../../issue/issue.service';
import { TaskAttachmentService } from '../../task-attachment/task-attachment.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { ProjectService } from '../../../project/project.service';
import { WorkContextService } from '../../../work-context/work-context.service';
import { GlobalConfigService } from '../../../config/global-config.service';
import { KeyboardConfig } from '../../../config/keyboard-config.model';
import { DialogScheduleTaskComponent } from '../../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { DialogTimeEstimateComponent } from '../../dialog-time-estimate/dialog-time-estimate.component';
import { DialogEditTaskAttachmentComponent } from '../../task-attachment/dialog-edit-attachment/dialog-edit-task-attachment.component';
import { throttle } from 'helpful-decorators';
import { DialogEditTagsForTaskComponent } from '../../../tag/dialog-edit-tags/dialog-edit-tags-for-task.component';
import { TODAY_TAG } from '../../../tag/tag.const';
import { DialogConfirmComponent } from '../../../../ui/dialog-confirm/dialog-confirm.component';
import { Update } from '@ngrx/entity';
import { IS_TOUCH_PRIMARY } from 'src/app/util/is-mouse-primary';
import { T } from 'src/app/t.const';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'task-context-menu-inner',
  standalone: true,
  imports: [
    AsyncPipe,
    IssueModule,
    MatIcon,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    NgForOf,
    TranslateModule,
    MatMenuTrigger,
    NgIf,
  ],
  templateUrl: './task-context-menu-inner.component.html',
  styleUrl: './task-context-menu-inner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskContextMenuInnerComponent implements AfterViewInit {
  protected readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  protected readonly T = T;

  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };

  @ViewChild('contextMenuTriggerEl', { static: true, read: MatMenuTrigger })
  contextMenuTrigger?: MatMenuTrigger;

  @ViewChild('contextMenu', { static: true, read: MatMenu }) contextMenu?: MatMenu;

  task!: TaskWithSubTasks;

  isTodayTag: boolean = false;
  isCurrent: boolean = false;
  isBacklog: boolean = false;

  private _task$: ReplaySubject<TaskWithSubTasks> = new ReplaySubject(1);
  issueUrl$: Observable<string | null> = this._task$.pipe(
    switchMap((v) => {
      return v.issueType && v.issueId && v.projectId
        ? this._issueService.issueLink$(v.issueType, v.issueId, v.projectId)
        : of(null);
    }),
    take(1),
  );
  moveToProjectList$: Observable<Project[]> = this._task$.pipe(
    map((t) => t.projectId),
    distinctUntilChanged(),
    switchMap((pid) => this._projectService.getProjectsWithoutId$(pid)),
  );

  isShowMoveFromAndToBacklogBtns$: Observable<boolean> = this._task$.pipe(
    take(1),
    switchMap((task) =>
      task.projectId ? this._projectService.getByIdOnce$(task.projectId) : EMPTY,
    ),
    map((project) => project.isEnableBacklog),
  );

  private _destroy$: Subject<boolean> = new Subject<boolean>();
  private _isTaskDeleteTriggered: boolean = false;

  @Input('task') set taskSet(v: TaskWithSubTasks) {
    this.task = v;
    this.isTodayTag = v.tagIds.includes(TODAY_TAG.id);
    this.isCurrent = this._taskService.currentTaskId === v.id;
    this._task$.next(v);
  }

  constructor(
    private readonly _taskService: TaskService,
    private readonly _taskRepeatCfgService: TaskRepeatCfgService,
    private readonly _matDialog: MatDialog,
    private readonly _issueService: IssueService,
    private readonly _attachmentService: TaskAttachmentService,
    private readonly _elementRef: ElementRef,
    private readonly _snackService: SnackService,
    private readonly _projectService: ProjectService,
    public readonly workContextService: WorkContextService,
    private readonly _globalConfigService: GlobalConfigService,
  ) {}

  ngAfterViewInit(): void {
    this.isBacklog = !!this._elementRef.nativeElement.closest('.backlog');
  }

  open(ev: MouseEvent | KeyboardEvent | TouchEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    if (ev instanceof MouseEvent || ev instanceof TouchEvent) {
      this.contextMenuPosition.x =
        ('touches' in ev ? ev.touches[0].clientX : ev.clientX) + 'px';
      this.contextMenuPosition.y =
        ('touches' in ev ? ev.touches[0].clientY : ev.clientY) + 'px';
    }

    this.contextMenuTrigger?.openMenu();
  }

  get kb(): KeyboardConfig {
    if (IS_TOUCH_PRIMARY) {
      return {} as any;
    }
    return (this._globalConfigService.cfg?.keyboard as KeyboardConfig) || {};
  }

  scheduleTask(): void {
    this._matDialog
      .open(DialogScheduleTaskComponent, {
        // we focus inside dialog instead
        autoFocus: false,
        data: { task: this.task },
      })
      .afterClosed()
      // .pipe(takeUntil(this._destroy$))
      .subscribe((isPlanned) => {
        if (isPlanned) {
          this.focusNext(true);
        } else {
          this.focusSelf();
        }
      });
  }

  updateIssueData(): void {
    this._issueService.refreshIssueTask(this.task, true, true);
  }

  // editTaskRepeatCfg(): void {
  //   this._matDialog
  //     .open(DialogEditTaskRepeatCfgComponent, {
  //       data: {
  //         task: this.task,
  //       },
  //     })
  //     .afterClosed()
  //     .pipe(takeUntil(this._destroy$))
  //     .subscribe(() => this.focusSelf());
  // }

  deleteTask(isClick: boolean = false): void {
    // NOTE: prevents attempts to delete the same task multiple times
    if (this._isTaskDeleteTriggered) {
      return;
    }
    // NOTE: in case we want the focus behaviour on click we could use:
    // this.focusSelf();
    if (!isClick) {
      this.focusNext(true);
    }

    this._isTaskDeleteTriggered = true;
    this._taskService.remove(this.task);
  }

  startTask(): void {
    this._taskService.setCurrentId(this.task.id);
    this.focusSelf();
  }

  pauseTask(): void {
    this._taskService.pauseCurrent();
  }

  estimateTime(): void {
    this._matDialog
      .open(DialogTimeEstimateComponent, {
        data: { task: this.task },
        autoFocus: !IS_TOUCH_PRIMARY,
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  addAttachment(): void {
    this._matDialog
      .open(DialogEditTaskAttachmentComponent, {
        data: {},
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe((result) => {
        if (result) {
          this._attachmentService.addAttachment(this.task.id, result);
        }
        this.focusSelf();
      });
  }

  addSubTask(): void {
    this._taskService.addSubTaskTo(this.task.parentId || this.task.id);
  }

  @throttle(200, { leading: true, trailing: false })
  toggleDoneKeyboard(): void {
    this.toggleTaskDone();
  }

  toggleTaskDone(): void {
    this.focusNext(true, true);

    if (this.task.isDone) {
      this._taskService.setUnDone(this.task.id);
    } else {
      this._taskService.setDone(this.task.id);
    }
  }

  async editTags(): Promise<void> {
    const taskToEdit = this.task.parentId
      ? await this._taskService.getByIdOnce$(this.task.parentId).toPromise()
      : this.task;
    this._matDialog
      .open(DialogEditTagsForTaskComponent, {
        data: {
          task: taskToEdit,
        },
      })
      .afterClosed()
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this.focusSelf());
  }

  addToMyDay(): void {
    this._taskService.addTodayTag(this.task);
  }

  removeFromMyDay(): void {
    this.onTagsUpdated(this.task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id));
  }

  convertToMainTask(): void {
    this._taskService.convertToMainTask(this.task);
  }

  focusPrevious(isFocusReverseIfNotPossible: boolean = false): void {
    if (IS_TOUCH_PRIMARY) {
      return;
    }

    const taskEls = Array.from(document.querySelectorAll('task'));
    const activeEl =
      document.activeElement?.tagName.toLowerCase() === 'task'
        ? document.activeElement
        : document.activeElement?.closest('task');
    const currentIndex = taskEls.findIndex((el) => el === activeEl);
    const prevEl = taskEls[currentIndex - 1] as HTMLElement;

    if (prevEl) {
      prevEl.focus();
      // hacky but works
      setTimeout(() => {
        if (document.activeElement !== prevEl) {
          prevEl.focus();
        }
      });
    } else if (isFocusReverseIfNotPossible) {
      this.focusNext();
    }
  }

  focusNext(
    isFocusReverseIfNotPossible: boolean = false,
    isTaskMovedInList = false,
  ): void {
    if (IS_TOUCH_PRIMARY) {
      return;
    }

    const taskEls = Array.from(document.querySelectorAll('task'));
    const activeEl =
      document.activeElement?.tagName.toLowerCase() === 'task'
        ? document.activeElement
        : document.activeElement?.closest('task');
    const currentIndex = taskEls.findIndex((el) => el === activeEl);
    const nextEl = isTaskMovedInList
      ? (() => {
          // if a parent task is moved in list, as it is for when toggling done,
          // we don't want to focus the next sub-task, but the next main task instead
          if (this.task.subTaskIds.length) {
            return taskEls.find((el, i) => {
              return i > currentIndex && el.parentElement?.closest('task');
            }) as HTMLElement | undefined;
          }
          return taskEls[currentIndex + 1] as HTMLElement;
        })()
      : (taskEls[currentIndex + 1] as HTMLElement);

    if (nextEl) {
      nextEl.focus();
      // hacky but works
      setTimeout(() => {
        if (document.activeElement !== nextEl) {
          nextEl.focus();
        }
      });
    } else if (isFocusReverseIfNotPossible) {
      this.focusPrevious();
    }
  }

  focusSelf(): void {
    if (IS_TOUCH_PRIMARY) {
      return;
    }

    this.focusTaskElement();
    // this._taskService.focusTask(this.task.id);
  }

  focusTaskElement(): void {
    this._elementRef.nativeElement.closest('task')?.focus();
  }

  onTagsUpdated(tagIds: string[]): void {
    this._taskService.updateTags(this.task, tagIds);
  }

  // TODO move to service
  moveTaskToProject(projectId: string): void {
    if (projectId === this.task.projectId) {
      return;
    } else if (this.task.issueId && this.task.issueType !== 'CALENDAR') {
      this._snackService.open({
        type: 'CUSTOM',
        ico: 'block',
        msg: T.F.TASK.S.MOVE_TO_PROJECT_NOT_ALLOWED_FOR_ISSUE_TASK,
      });
      return;
    } else if (!this.task.repeatCfgId) {
      this._taskService.moveToProject(this.task, projectId);
    } else {
      forkJoin([
        this._taskRepeatCfgService
          .getTaskRepeatCfgById$(this.task.repeatCfgId)
          .pipe(first()),
        this._taskService
          .getTasksWithSubTasksByRepeatCfgId$(this.task.repeatCfgId)
          .pipe(first()),
        this._taskService.getArchiveTasksForRepeatCfgId(this.task.repeatCfgId),
        this._projectService.getByIdOnce$(projectId),
      ])
        .pipe(
          concatMap(
            ([
              reminderCfg,
              nonArchiveInstancesWithSubTasks,
              archiveInstances,
              targetProject,
            ]) => {
              console.log({
                reminderCfg,
                nonArchiveInstancesWithSubTasks,
                archiveInstances,
              });

              // if there is only a single instance (probably just created) than directly update the task repeat cfg
              if (
                nonArchiveInstancesWithSubTasks.length === 1 &&
                archiveInstances.length === 0
              ) {
                this._taskRepeatCfgService.updateTaskRepeatCfg(reminderCfg.id, {
                  projectId,
                });
                this._taskService.moveToProject(this.task, projectId);
                return EMPTY;
              }

              return this._matDialog
                .open(DialogConfirmComponent, {
                  data: {
                    okTxt: T.F.TASK_REPEAT.D_CONFIRM_MOVE_TO_PROJECT.OK,
                    message: T.F.TASK_REPEAT.D_CONFIRM_MOVE_TO_PROJECT.MSG,
                    translateParams: {
                      projectName: targetProject.title,
                      tasksNr:
                        nonArchiveInstancesWithSubTasks.length + archiveInstances.length,
                    },
                  },
                })
                .afterClosed()
                .pipe(
                  tap((isConfirm) => {
                    if (isConfirm) {
                      this._taskRepeatCfgService.updateTaskRepeatCfg(reminderCfg.id, {
                        projectId,
                      });
                      nonArchiveInstancesWithSubTasks.forEach((nonArchiveTask) => {
                        this._taskService.moveToProject(nonArchiveTask, projectId);
                      });

                      const archiveUpdates: Update<TaskCopy>[] = [];
                      archiveInstances.forEach((archiveTask) => {
                        archiveUpdates.push({
                          id: archiveTask.id,
                          changes: { projectId },
                        });
                        if (archiveTask.subTaskIds.length) {
                          archiveTask.subTaskIds.forEach((subId) => {
                            archiveUpdates.push({
                              id: subId,
                              changes: { projectId },
                            });
                          });
                        }
                      });
                      this._taskService.updateArchiveTasks(archiveUpdates);
                    }
                  }),
                );
            },
          ),
        )
        .subscribe(() => this.focusSelf());
    }
  }

  moveToBacklog(): void {
    if (this.task.projectId && !this.task.parentId) {
      this._projectService.moveTaskToBacklog(this.task.id, this.task.projectId);
      if (this.task.tagIds.includes(TODAY_TAG.id)) {
        this.removeFromMyDay();
      }
    }
  }

  moveToToday(): void {
    if (this.task.projectId && !this.task.parentId) {
      this._projectService.moveTaskToTodayList(this.task.id, this.task.projectId);
      this.addToMyDay();
    }
  }

  trackByProjectId(i: number, project: Project): string {
    return project.id;
  }
}
