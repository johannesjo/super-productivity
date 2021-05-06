import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { getWorklogStr } from '../../../util/get-work-log-str';
import 'moment-duration-format';
// @ts-ignore
import Clipboard from 'clipboard';
import { SnackService } from '../../../core/snack/snack.service';
import { WorklogService } from '../worklog.service';
import {
  WorklogColTypes,
  WorklogExportSettingsCopy,
  WorklogGrouping,
} from '../worklog.model';
import { T } from '../../../t.const';
import { distinctUntilChanged } from 'rxjs/operators';
import { distinctUntilChangedObject } from '../../../util/distinct-until-changed-object';
import { WorkContextAdvancedCfg } from '../../work-context/work-context.model';
import { WORKLOG_EXPORT_DEFAULTS } from '../../work-context/work-context.const';
import { WorkContextService } from '../../work-context/work-context.service';
import { ProjectService } from '../../project/project.service';
import { TagService } from '../../tag/tag.service';
import { createRows, formatRows, formatText } from './worklog-export.util';

@Component({
  selector: 'worklog-export',
  templateUrl: './worklog-export.component.html',
  styleUrls: ['./worklog-export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorklogExportComponent implements OnInit, OnDestroy {
  @Input() rangeStart?: Date;
  @Input() rangeEnd?: Date;
  @Input() isWorklogExport?: boolean;
  @Input() isShowClose?: boolean;
  @Input() projectId?: string | null;

  @Output() cancel: EventEmitter<void> = new EventEmitter();

  T: typeof T = T;
  isShowAsText: boolean = false;
  headlineCols: string[] = [];
  formattedRows?: (string | number | undefined)[][];
  options: WorklogExportSettingsCopy = {
    ...WORKLOG_EXPORT_DEFAULTS,
    cols: [...WORKLOG_EXPORT_DEFAULTS.cols],
  };
  txt: string = '';
  fileName: string = 'tasks.csv';
  roundTimeOptions: { id: string; title: string }[] = [
    { id: 'QUARTER', title: T.F.WORKLOG.EXPORT.O.FULL_QUARTERS },
    { id: 'HALF', title: T.F.WORKLOG.EXPORT.O.FULL_HALF_HOURS },
    { id: 'HOUR', title: T.F.WORKLOG.EXPORT.O.FULL_HOURS },
  ];

  colOpts: { id: string; title: string }[] = [
    { id: 'DATE', title: T.F.WORKLOG.EXPORT.O.DATE },
    { id: 'START', title: T.F.WORKLOG.EXPORT.O.STARTED_WORKING },
    { id: 'END', title: T.F.WORKLOG.EXPORT.O.ENDED_WORKING },
    { id: 'TITLES', title: T.F.WORKLOG.EXPORT.O.PARENT_TASK_TITLES_ONLY },
    {
      id: 'TITLES_INCLUDING_SUB',
      title: T.F.WORKLOG.EXPORT.O.TITLES_AND_SUB_TASK_TITLES,
    },
    { id: 'NOTES', title: T.F.WORKLOG.EXPORT.O.NOTES },
    { id: 'PROJECTS', title: T.F.WORKLOG.EXPORT.O.PROJECTS },
    { id: 'TAGS', title: T.F.WORKLOG.EXPORT.O.TAGS },
    { id: 'TIME_MS', title: T.F.WORKLOG.EXPORT.O.TIME_AS_MILLISECONDS },
    { id: 'TIME_STR', title: T.F.WORKLOG.EXPORT.O.TIME_AS_STRING },
    { id: 'TIME_CLOCK', title: T.F.WORKLOG.EXPORT.O.TIME_AS_CLOCK },
    { id: 'ESTIMATE_MS', title: T.F.WORKLOG.EXPORT.O.ESTIMATE_AS_MILLISECONDS },
    { id: 'ESTIMATE_STR', title: T.F.WORKLOG.EXPORT.O.ESTIMATE_AS_STRING },
    { id: 'ESTIMATE_CLOCK', title: T.F.WORKLOG.EXPORT.O.ESTIMATE_AS_CLOCK },
  ];

  groupByOptions: { id: string; title: string }[] = [
    { id: WorklogGrouping.DATE, title: T.F.WORKLOG.EXPORT.O.DATE },
    { id: WorklogGrouping.TASK, title: T.F.WORKLOG.EXPORT.O.TASK_SUBTASK },
    { id: WorklogGrouping.PARENT, title: T.F.WORKLOG.EXPORT.O.PARENT_TASK },
    { id: WorklogGrouping.WORKLOG, title: T.F.WORKLOG.EXPORT.O.WORKLOG },
  ];

  private _subs: Subscription = new Subscription();

  constructor(
    private _snackService: SnackService,
    private _worklogService: WorklogService,
    private _workContextService: WorkContextService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _projectService: ProjectService,
    private _tagService: TagService,
  ) {}

  ngOnInit() {
    if (!this.rangeStart || !this.rangeEnd) {
      throw new Error('Worklog: Invalid date range');
    }
    this.fileName =
      'tasks' +
      getWorklogStr(this.rangeStart) +
      '-' +
      getWorklogStr(this.rangeEnd) +
      '.csv';

    this._subs.add(
      this._workContextService.advancedCfg$
        .pipe(distinctUntilChanged(distinctUntilChangedObject))
        .subscribe((advancedCfg: WorkContextAdvancedCfg) => {
          if (advancedCfg.worklogExportSettings) {
            this.options = {
              ...WORKLOG_EXPORT_DEFAULTS,
              ...advancedCfg.worklogExportSettings,
              // NOTE: if we don't do this typescript(?) get's aggressive
              cols: [
                ...(advancedCfg.worklogExportSettings
                  ? [...advancedCfg.worklogExportSettings.cols]
                  : [...WORKLOG_EXPORT_DEFAULTS.cols]),
              ],
            };
          } else {
            this.options = {
              ...WORKLOG_EXPORT_DEFAULTS,
              cols: [...WORKLOG_EXPORT_DEFAULTS.cols],
            };
          }
          this._changeDetectorRef.detectChanges();
        }),
    );

    this._subs.add(
      combineLatest([
        this._worklogService.getTaskListForRange$(
          this.rangeStart,
          this.rangeEnd,
          true,
          this.projectId,
        ),
        this._workContextService.activeWorkContext$,
        this._projectService.list$,
        this._tagService.tags$,
      ])
        .pipe()
        .subscribe(([tasks, ac, projects, tags]) => {
          if (tasks) {
            const workTimes = { start: ac.workStart, end: ac.workEnd };
            const data = { tasks, projects, tags, workTimes };
            const rows = createRows(data, this.options.groupBy);
            this.formattedRows = formatRows(rows, this.options);
            // TODO format to csv

            this.headlineCols = this.options.cols.map((col) => {
              switch (col) {
                case 'DATE':
                  return 'Date';
                case 'START':
                  return 'Start';
                case 'END':
                  return 'End';
                case 'TITLES':
                  return 'Titles';
                case 'TITLES_INCLUDING_SUB':
                  return 'Titles';
                case 'NOTES':
                  return 'Descriptions';
                case 'PROJECTS':
                  return 'Projects';
                case 'TAGS':
                  return 'Tags';
                case 'TIME_MS':
                case 'TIME_STR':
                case 'TIME_CLOCK':
                  return 'Worked';
                case 'ESTIMATE_MS':
                case 'ESTIMATE_STR':
                case 'ESTIMATE_CLOCK':
                  return 'Estimate';
                default:
                  return 'INVALID COL';
              }
            });

            this.txt = formatText(this.headlineCols, this.formattedRows);
            this._changeDetectorRef.detectChanges();
          }
        }),
    );

    // dirty but good enough for now
    const clipboard = new Clipboard('#clipboard-btn');
    clipboard.on('success', (e: any) => {
      this._snackService.open({
        msg: T.GLOBAL_SNACK.COPY_TO_CLIPPBOARD,
        type: 'SUCCESS',
      });
      e.clearSelection();
    });
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onCloseClick() {
    this.cancel.emit();
  }

  onOptionsChange() {
    this.options.cols = this.options.cols.filter((col) => !!col);
    this._workContextService.updateWorklogExportSettingsForCurrentContext(this.options);
  }

  addCol(colOpt: WorklogColTypes) {
    this.options.cols.push(colOpt);
  }

  trackByIndex(i: number, p: any) {
    return i;
  }
}
