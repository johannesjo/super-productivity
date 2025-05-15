import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../task.service';
import { MatDialog } from '@angular/material/dialog';
import { WorklogService } from '../../worklog/worklog.service';
import { DialogWorklogExportComponent } from '../../worklog/dialog-worklog-export/dialog-worklog-export.component';
import { Project, RoundTimeOption } from '../../project/project.model';
import { Task } from '../task.model';
import { T } from 'src/app/t.const';
import { ProjectService } from '../../project/project.service';
import { unique } from '../../../util/unique';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  mapToProjectWithTasks,
  ProjectWithTasks,
} from './map-to-project-with-tasks.util';
import { DateService } from 'src/app/core/date/date.service';
import { MatIcon } from '@angular/material/icon';
import { TaskSummaryTableComponent } from '../task-summary-table/task-summary-table.component';
import { MatButton } from '@angular/material/button';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { AsyncPipe } from '@angular/common';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'task-summary-tables',
  templateUrl: './task-summary-tables.component.html',
  styleUrls: ['./task-summary-tables.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    TaskSummaryTableComponent,
    MatButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    AsyncPipe,
    MsToStringPipe,
    TranslatePipe,
  ],
})
export class TaskSummaryTablesComponent {
  readonly workContextService = inject(WorkContextService);
  private readonly _taskService = inject(TaskService);
  private readonly _translateService = inject(TranslateService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _worklogService = inject(WorklogService);
  private readonly _projectService = inject(ProjectService);
  private _dateService = inject(DateService);

  T: typeof T = T;

  readonly dayStr = input<string>(this._dateService.todayStr());

  readonly flatTasks = input<Task[]>([]);
  readonly isForToday = input<boolean>(true);

  readonly isShowYesterday = input<boolean>(false);

  readonly projectIds = computed(() => {
    return unique(
      this.flatTasks()
        .map((t) => t.projectId)
        .filter((pid) => typeof pid === 'string'),
    ) as string[];
  });

  private readonly _allProjects = toSignal(this._projectService.list$, {
    initialValue: [],
  });

  readonly projects = computed(() => {
    const allProjects = this._allProjects();
    // NOTE: the order is like the ones in the menu
    const mappedProjects = allProjects
      .filter((project) => this.projectIds().includes(project.id))
      .map((project) => this._mapToProjectWithTasks(project));

    if (this.flatTasks().find((task) => !task.projectId)) {
      const noProjectProject: ProjectWithTasks = this._mapToProjectWithTasks({
        id: null,
        title: this._translateService.instant(T.G.WITHOUT_PROJECT),
      });

      return [...mappedProjects, noProjectProject];
    }
    return mappedProjects;
  });

  onTaskSummaryEdit(): void {
    this._worklogService.refreshWorklog();
  }

  showExportModal(projectId?: string | null): void {
    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        projectId,
        rangeStart: new Date().setHours(0, 0, 0, 0),
        rangeEnd: new Date().setHours(23, 59, 59),
      },
    });
  }

  async roundTimeForTasks(
    projectId: string | null,
    roundTo: RoundTimeOption,
    isRoundUp: boolean = false,
  ): Promise<void> {
    const taskIds = this.flatTasks().map((task) => task.id);
    await this._taskService.roundTimeSpentForDayEverywhere({
      day: this.dayStr(),
      taskIds,
      roundTo,
      isRoundUp,
      projectId,
    });
    this._worklogService.refreshWorklog();
  }

  private _mapToProjectWithTasks(
    project: Project | { id: string | null; title: string },
  ): ProjectWithTasks {
    let yesterdayStr: string | undefined;
    if (this.isShowYesterday() && this.isForToday()) {
      const t = new Date();
      t.setDate(t.getDate() - 1);
      yesterdayStr = this._dateService.todayStr(t);
    }

    return mapToProjectWithTasks(project, this.flatTasks(), this.dayStr(), yesterdayStr);
  }
}
