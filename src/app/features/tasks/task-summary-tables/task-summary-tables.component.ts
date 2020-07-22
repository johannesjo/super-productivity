import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../task.service';
import { MatDialog } from '@angular/material/dialog';
import { WorklogService } from '../../worklog/worklog.service';
import { DialogWorklogExportComponent } from '../../worklog/dialog-worklog-export/dialog-worklog-export.component';
import { Project, RoundTimeOption } from '../../project/project.model';
import { Task } from '../task.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { T } from 'src/app/t.const';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { ProjectService } from '../../project/project.service';
import { unique } from '../../../util/unique';

@Component({
  selector: 'task-summary-tables',
  templateUrl: './task-summary-tables.component.html',
  styleUrls: ['./task-summary-tables.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskSummaryTablesComponent {
  // tslint:disable-next-line:typedef
  T = T;

  @Input() dayStr: string = getWorklogStr();

  @Input() isForToday: boolean = true;

  @Input('flatTasks') set flatTasksIn(v: Task[]) {
    this.flatTasks = v;
    const pids = unique(v.map(t => t.projectId).filter(pid => typeof pid === 'string')) as string[];
    this.projectIds$.next(pids);
  };

  flatTasks: Task[] = [];

  projectIds$: BehaviorSubject<string[]> = new BehaviorSubject([]);
  projects$: Observable<Project[]> = this.projectIds$.pipe(
    withLatestFrom(this._projectService.list$),
    map(([pids, projects]) => pids.map((pid) => {
      const project = projects.find(p => p.id === pid);
      if (!project) {
        throw new Error('Project not found');
      }
      return project;
    }))
  );

  constructor(
    public readonly workContextService: WorkContextService,
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _worklogService: WorklogService,
    private readonly _projectService: ProjectService,
  ) {
    this.projectIds$.subscribe((v) => console.log('projectIds$', v));
    this.projects$.subscribe((v) => console.log('projects$', v));
  }

  onTaskSummaryEdit() {
    this._worklogService.refreshWorklog();
  }

  showExportModal() {
    this._matDialog.open(DialogWorklogExportComponent, {
      restoreFocus: true,
      panelClass: 'big',
      data: {
        rangeStart: new Date().setHours(0, 0, 0, 0),
        rangeEnd: new Date().setHours(23, 59, 59),
      }
    });
  }

  roundTimeForTasks(roundTo: RoundTimeOption, isRoundUp: boolean = false) {
    const taskIds = this.flatTasks.map(task => task.id);
    this._taskService.roundTimeSpentForDay(this.dayStr, taskIds, roundTo, isRoundUp);
  }

  trackById(i: number, item: Project) {
    return item.id;
  }
}
