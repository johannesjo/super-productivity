import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  Input,
  LOCALE_ID,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ShowSubTasksMode, TaskDetailTargetPanel, TaskWithSubTasks } from '../task.model';
import { IssueService } from '../../issue/issue.service';
import { TaskAttachmentService } from '../task-attachment/task-attachment.service';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  of,
  ReplaySubject,
  Subject,
} from 'rxjs';
import {
  TaskAttachment,
  TaskAttachmentCopy,
} from '../task-attachment/task-attachment.model';
import {
  catchError,
  delay,
  filter,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  withLatestFrom,
} from 'rxjs/operators';
import { T } from '../../../t.const';
import { TaskService } from '../task.service';
import {
  expandAnimation,
  expandFadeInOnlyAnimation,
} from '../../../ui/animations/expand.ani';
import { fadeAnimation } from '../../../ui/animations/fade.ani';
import { swirlAnimation } from '../../../ui/animations/swirl-in-out.ani';
import { DialogTimeEstimateComponent } from '../dialog-time-estimate/dialog-time-estimate.component';
import { MatDialog } from '@angular/material/dialog';
import { isTouchOnly } from '../../../util/is-touch-only';
import { ReminderCopy } from '../../reminder/reminder.model';
import { ReminderService } from '../../reminder/reminder.service';
import { DialogEditTaskRepeatCfgComponent } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { DialogEditTaskAttachmentComponent } from '../task-attachment/dialog-edit-attachment/dialog-edit-task-attachment.component';
import { TaskDetailItemComponent } from './task-additional-info-item/task-detail-item.component';
import { IssueData, IssueProviderKey } from '../../issue/issue.model';
import { JIRA_TYPE } from '../../issue/issue.const';
import { ProjectService } from '../../project/project.service';
import { IS_ELECTRON } from '../../../app.constants';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { devError } from '../../../util/dev-error';
import { SS } from '../../../core/persistence/storage-keys.const';
import { IS_MOBILE } from '../../../util/is-mobile';
import { GlobalConfigService } from '../../config/global-config.service';
import { shareReplayUntil } from '../../../util/share-replay-until';
import { TranslateService } from '@ngx-translate/core';
import { getTaskRepeatInfoText } from './get-task-repeat-info-text.util';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { PlannerService } from '../../planner/planner.service';
import { DialogScheduleTaskComponent } from '../../planner/dialog-schedule-task/dialog-schedule-task.component';
import { DragulaService } from 'ng2-dragula';

interface IssueAndType {
  id: string | number | null;
  type: IssueProviderKey | null;
}

interface IssueDataAndType {
  issueData: IssueData | null;
  issueType: IssueProviderKey | null;
}

@Component({
  selector: 'task-detail-panel',
  templateUrl: './task-detail-panel.component.html',
  styleUrls: ['./task-detail-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, expandFadeInOnlyAnimation, fadeAnimation, swirlAnimation],
})
export class TaskDetailPanelComponent implements AfterViewInit, OnDestroy {
  @Input() isOver: boolean = false;
  @Input() isDialogMode: boolean = false;

  @ViewChildren(TaskDetailItemComponent)
  itemEls?: QueryList<TaskDetailItemComponent>;
  @ViewChild('attachmentPanelElRef')
  attachmentPanelElRef?: TaskDetailItemComponent;
  IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;

  _onDestroy$ = new Subject<void>();

  ShowSubTasksMode: typeof ShowSubTasksMode = ShowSubTasksMode;
  selectedItemIndex: number = 0;
  isFocusNotes: boolean = false;
  isDragOver: boolean = false;

  T: typeof T = T;
  issueAttachments: TaskAttachment[] = [];
  reminderId$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  reminderData$: Observable<ReminderCopy | null> = this.reminderId$.pipe(
    switchMap((id) => (id ? this._reminderService.getById$(id) : of(null))),
  );

  repeatCfgId$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  repeatCfgLabel$: Observable<string | null> = this.repeatCfgId$.pipe(
    switchMap((id) =>
      id
        ? // TODO for some reason this can be undefined, maybe there is a better way
          this._taskRepeatCfgService.getTaskRepeatCfgByIdAllowUndefined$(id).pipe(
            map((repeatCfg) => {
              if (!repeatCfg) {
                return null;
              }
              const [key, params] = getTaskRepeatInfoText(repeatCfg, this.locale);
              return this._translateService.instant(key, params);
            }),
          )
        : of(null),
    ),
  );
  parentId$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  parentTaskData$: Observable<TaskWithSubTasks | null> = this.parentId$.pipe(
    switchMap((id) => (!!id ? this.taskService.getByIdWithSubTaskData$(id) : of(null))),
  );

  localAttachments?: TaskAttachment[];

  // NOTE: should be treated as private
  _taskData?: TaskWithSubTasks;

  issueIdAndType$: Subject<IssueAndType> = new ReplaySubject(1);
  issueDataNullTrigger$: Subject<IssueAndType | null> = new Subject();

  issueDataTrigger$: Observable<IssueAndType | null> = merge(
    this.issueIdAndType$,
    this.issueDataNullTrigger$,
  );
  issueData?: IssueData | null | false;

  // NOTE: null means is loading, false means just don't show
  issueDataAndType$: Observable<IssueDataAndType | null | false> =
    this.issueDataTrigger$.pipe(
      switchMap((args) => {
        if (args && args.id && args.type) {
          if (this._taskData?.issueType === 'CALENDAR') {
            return of(null);
          }
          if (!this._taskData || !this._taskData.projectId) {
            throw new Error('task data not ready');
          }
          return this._issueService
            .getById$(args.type, args.id, this._taskData.projectId)
            .pipe(
              // NOTE we need this, otherwise the error is going to weird up the observable
              catchError(() => {
                return of(false);
              }),
              map((issueDataIfGiven) =>
                issueDataIfGiven
                  ? { issueData: issueDataIfGiven, issueType: args.type }
                  : issueDataIfGiven,
              ),
            ) as Observable<false | null | IssueDataAndType>;
        }
        return of(null);
      }),
      shareReplayUntil(this._onDestroy$, 1),
      // NOTE: this seems to fix the issue loading bug, when we end up with the
      // expandable closed when the data is loaded
      delay(50),
    );

  issueData$: Observable<IssueData | null | false> = this.issueDataAndType$.pipe(
    map((issueDataAndType) =>
      issueDataAndType ? issueDataAndType.issueData : issueDataAndType,
    ),
    shareReplay(1),
  );

  isIssueDataLoadedForCurrentType$: Observable<boolean> = combineLatest([
    this.issueDataAndType$,
    this.issueDataTrigger$,
  ]).pipe(
    map(
      ([issueDataAndType, issueDataTrigger]): boolean =>
        !!(
          issueDataAndType &&
          issueDataTrigger &&
          issueDataAndType.issueType === issueDataTrigger.type
        ),
    ),
  );

  issueAttachments$: Observable<TaskAttachmentCopy[]> = this.issueData$.pipe(
    withLatestFrom(this.issueIdAndType$),
    map(([data, { type }]) =>
      data && type ? this._issueService.getMappedAttachments(type, data) : [],
    ),
  );
  defaultTaskNotes: string = '';

  isExpandedIssuePanel: boolean = false;
  isExpandedNotesPanel: boolean = false;
  isExpandedAttachmentPanel: boolean = !IS_MOBILE;

  private _focusTimeout?: number;
  private _dragEnterTarget?: HTMLElement;

  constructor(
    public attachmentService: TaskAttachmentService,
    public taskService: TaskService,
    public layoutService: LayoutService,
    private _globalConfigService: GlobalConfigService,
    private _issueService: IssueService,
    private _reminderService: ReminderService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _matDialog: MatDialog,
    private _projectService: ProjectService,
    public readonly plannerService: PlannerService,
    private readonly _attachmentService: TaskAttachmentService,
    private _translateService: TranslateService,
    private _dragulaService: DragulaService,
    @Inject(LOCALE_ID) private locale: string,
    private _cd: ChangeDetectorRef,
  ) {
    // NOTE: needs to be assigned here before any setter is called
    this.issueAttachments$
      .pipe(takeUntil(this._onDestroy$))
      .subscribe((attachments) => (this.issueAttachments = attachments));

    this._globalConfigService.misc$
      .pipe(takeUntil(this._onDestroy$))
      .subscribe((misc) => (this.defaultTaskNotes = misc.taskNotesTpl));

    this.issueData$.pipe(takeUntil(this._onDestroy$)).subscribe((issueData) => {
      this.issueData = issueData;
      this.isExpandedIssuePanel = !IS_MOBILE && !!this.issueData;
      this._cd.detectChanges();
    });

    // NOTE: this works as long as there is no other place to display issue attachments for jira
    if (IS_ELECTRON) {
      this.issueIdAndType$
        .pipe(
          takeUntil(this._onDestroy$),
          filter(({ id, type }) => type === JIRA_TYPE),
          // not strictly reactive reactive but should work a 100% as issueIdAndType are triggered after task data
          switchMap(() => {
            if (!this._taskData || !this._taskData.projectId) {
              throw new Error('task data not ready');
            }
            return this._projectService.getJiraCfgForProject$(this._taskData.projectId);
          }),
          takeUntil(this._onDestroy$),
        )
        .subscribe((jiraCfg) => {
          if (jiraCfg.isEnabled) {
            window.ea.jiraSetupImgHeaders({
              jiraCfg,
              wonkyCookie: jiraCfg.isWonkyCookieMode
                ? sessionStorage.getItem(SS.JIRA_WONKY_COOKIE) || undefined
                : undefined,
            });
          }
        });
    }
    // this.issueIdAndType$.subscribe((v) => console.log('issueIdAndType$', v));
    // this.issueDataTrigger$.subscribe((v) => console.log('issueDataTrigger$', v));
    // this.issueData$.subscribe((v) => console.log('issueData$', v));

    // NOTE: check work-view component for more info
    const sub = this._dragulaService.find('SUB');
    if (!sub) {
      this._dragulaService.createGroup('SUB', {
        direction: 'vertical',
        moves: (el, container, handle) => {
          return false;
        },
      });
    }
  }

  get task(): TaskWithSubTasks {
    return this._taskData as TaskWithSubTasks;
  }

  @Input() set task(newVal: TaskWithSubTasks) {
    const prev = this._taskData;
    this._taskData = newVal;
    this.localAttachments = newVal.attachments;

    if (!prev || !newVal || prev.id !== newVal.id) {
      this._focusFirst();
    }

    // NOTE: check for task change or issue update
    if (
      !prev ||
      prev.issueId !== newVal.issueId ||
      (newVal.issueWasUpdated === true && !prev.issueWasUpdated)
    ) {
      this.issueDataNullTrigger$.next(null);

      this.issueIdAndType$.next({
        id: newVal.issueId,
        type: newVal.issueType,
      });
    }
    if (!newVal.issueId) {
      this.issueDataNullTrigger$.next(null);
    }

    if (!prev || prev.reminderId !== newVal.reminderId) {
      this.reminderId$.next(newVal.reminderId);
    }

    if (!prev || prev.repeatCfgId !== newVal.repeatCfgId) {
      this.repeatCfgId$.next(newVal.repeatCfgId);
    }

    if (!prev || prev.parentId !== newVal.parentId) {
      this.parentId$.next(newVal.parentId);
    }

    // panel states
    this.isExpandedIssuePanel = !IS_MOBILE && !!this.issueData;
    this.isExpandedNotesPanel =
      !IS_MOBILE && (!!newVal.notes || (!newVal.issueId && !newVal.attachments?.length));
  }

  get progress(): number {
    return (
      (this._taskData &&
        this._taskData.timeEstimate &&
        (this._taskData.timeSpent / this._taskData.timeEstimate) * 100) ||
      0
    );
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
    this._attachmentService.createFromDrop(ev, this.task.id);
    ev.stopPropagation();
    this.isDragOver = false;
  }

  ngAfterViewInit(): void {
    this.taskService.taskDetailPanelTargetPanel$
      .pipe(
        takeUntil(this._onDestroy$),
        // hacky but we need a minimal delay to make sure selectedTaskId is ready
        delay(50),
        withLatestFrom(this.taskService.selectedTaskId$),
        filter(([, id]) => !!id),
        // delay(100),
      )
      .subscribe(([v]) => {
        if (v === TaskDetailTargetPanel.Attachments) {
          if (!this.attachmentPanelElRef) {
            devError('this.attachmentPanelElRef not ready');
            this._focusFirst();
          } else {
            this.focusItem(this.attachmentPanelElRef);
          }
        } else {
          this._focusFirst();
        }
      });
  }

  ngOnDestroy(): void {
    this._onDestroy$.next();
    this._onDestroy$.complete();
    window.clearTimeout(this._focusTimeout);
  }

  changeTaskNotes($event: string): void {
    if (
      !this.defaultTaskNotes ||
      !$event ||
      $event.trim() !== this.defaultTaskNotes.trim()
    ) {
      this.taskService.update(this.task.id, { notes: $event });
    }
  }

  estimateTime(): void {
    this._matDialog.open(DialogTimeEstimateComponent, {
      data: { task: this.task },
      autoFocus: !isTouchOnly(),
    });
  }

  scheduleTask(): void {
    this._matDialog.open(DialogScheduleTaskComponent, {
      // we focus inside dialog instead
      autoFocus: false,
      restoreFocus: true,
      data: { task: this.task },
    });
  }

  editTaskRepeatCfg(): void {
    this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
      restoreFocus: true,
      data: {
        task: this.task,
      },
    });
  }

  addAttachment(): void {
    this._matDialog
      .open(DialogEditTaskAttachmentComponent, {
        data: {},
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.attachmentService.addAttachment(this.task.id, {
            ...result,
          });
        }
      });
  }

  addSubTask(): void {
    this.taskService.addSubTaskTo(this.task.parentId || this.task.id);
  }

  collapseParent(): void {
    if (!this.isDialogMode) {
      this.taskService.setSelectedId(null);
      // NOTE: it might not always be possible to focus task since it might gone from the screen
      this.taskService.focusTaskIfPossible(this.task.id);
    }
  }

  onItemKeyPress(ev: KeyboardEvent): void {
    if (!this.itemEls) {
      throw new Error();
    }

    if (ev.key === 'ArrowUp' && this.selectedItemIndex > 0) {
      this.selectedItemIndex--;
      this.itemEls.toArray()[this.selectedItemIndex].focusEl();
    } else if (
      ev.key === 'ArrowDown' &&
      this.itemEls.toArray().length > this.selectedItemIndex + 1
    ) {
      this.selectedItemIndex++;
      this.itemEls.toArray()[this.selectedItemIndex].focusEl();
    }
  }

  focusItem(cmpInstance: TaskDetailItemComponent, timeoutDuration: number = 150): void {
    window.clearTimeout(this._focusTimeout);
    this._focusTimeout = window.setTimeout(() => {
      if (!this.itemEls) {
        throw new Error();
      }

      const i = this.itemEls.toArray().findIndex((el) => el === cmpInstance);
      if (i === -1) {
        this.focusItem(cmpInstance);
      } else {
        this.selectedItemIndex = i;
        cmpInstance.elementRef.nativeElement.focus();
      }
    }, timeoutDuration);
  }

  updateTaskTitleIfChanged(isChanged: boolean, newTitle: string): void {
    if (isChanged) {
      if (!this._taskData) {
        throw new Error('No task data');
      }

      this.taskService.update(this._taskData.id, { title: newTitle });
    }
  }

  private _focusFirst(): void {
    this._focusTimeout = window.setTimeout(() => {
      if (!this.itemEls) {
        throw new Error();
      }
      this.focusItem(this.itemEls.first, 0);
    }, 150);
  }
}
