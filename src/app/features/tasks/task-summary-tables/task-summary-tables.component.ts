import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../task.service';
import { MatDialog } from '@angular/material/dialog';
import { WorklogService } from '../../worklog/worklog.service';
import { DialogWorklogExportComponent } from '../../worklog/dialog-worklog-export/dialog-worklog-export.component';
import { RoundTimeOption } from '../../project/project.model';
import { Task } from '../task.model';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { T } from 'src/app/t.const';

@Component({
  selector: 'task-summary-tables',
  templateUrl: './task-summary-tables.component.html',
  styleUrls: ['./task-summary-tables.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskSummaryTablesComponent implements OnInit {
  // tslint:disable-next-line:typedef
  T = T;

  @Input() dayStr: string = getWorklogStr();
  @Input() flatTasks: Task[] = [];
  @Input() isForToday: boolean = true;

  constructor(
    public readonly workContextService: WorkContextService,
    private readonly _taskService: TaskService,
    private readonly _matDialog: MatDialog,
    private readonly _worklogService: WorklogService,
  ) {
  }

  ngOnInit(): void {
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

  async roundTimeForTasks(roundTo: RoundTimeOption, isRoundUp: boolean = false) {
    const taskIds = this.flatTasks.map(task => task.id);
    this._taskService.roundTimeSpentForDay(this.dayStr, taskIds, roundTo, isRoundUp);
  }
}
