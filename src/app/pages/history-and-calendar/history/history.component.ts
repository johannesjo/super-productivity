import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { ProjectService } from '../../../project/project.service';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { mapArchiveToWorklog, WorklogDay, WorklogMonth } from '../../../core/util/map-archive-to-worklog';


@Component({
  selector: 'history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandFadeAnimation]
})
export class HistoryComponent implements OnInit {
  worklog: any = {};

  constructor(
    private _persistenceService: PersistenceService,
    private _projectService: ProjectService) {
  }

  ngOnInit() {
    const completeState = this._persistenceService.loadTaskArchiveForProject(this._projectService.currentId);
    this.worklog = mapArchiveToWorklog(completeState);
  }

  exportData(type, data) {
    if (type === 'MONTH') {
      // const tasks = vm.createTasksForMonth(data);
      // Dialogs('SIMPLE_TASK_SUMMARY', {
      //   settings: $rootScope.r.uiHelper.timeTrackingHistoryExportSettings,
      //   tasks: tasks,
      //   finishDayFn: false
      // }, true);
    }
  }

  private _createTasksForDay(data: { [key: number]: WorklogDay }) {
    const tasks = [];
    const dayData = {...data};

    dayData.ent.forEach((entry) => {
      const task = entry.task;
      task.timeSpent = entry.timeSpent;
      task.dateStr = dayData.dateStr;
      tasks.push(task);
    });

    return tasks;
  }

  private _createTasksForMonth(data: { [key: number]: WorklogMonth }) {
    let tasks = [];
    const monthData = {...data};
    monthData.ent.forEach((entry) => {
      tasks = tasks.concat(this.createTasksForDay(entry));
    });
    return tasks;
  }
}
