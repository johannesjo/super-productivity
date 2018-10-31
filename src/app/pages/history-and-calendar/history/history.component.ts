import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { ProjectService } from '../../../project/project.service';
import { EntityState } from '@ngrx/entity';
import { Task } from '../../../tasks/task.model';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';

const mapArchiveToWorklog = (taskState: EntityState<Task>) => {
  const entities = taskState.entities;
  const worklog = {};

  Object.keys(entities).forEach(id => {
    const task = entities[id];

    Object.keys(task.timeSpentOnDay).forEach(dateStr => {
      const split = dateStr.split('-');
      const year = parseInt(split[0], 10);
      const month = parseInt(split[1], 10);
      const day = parseInt(split[2], 10);
      if (!worklog[year]) {
        worklog[year] = {
          timeSpent: 0,
          ent: {}
        };
      }
      if (!worklog[year].ent[month]) {
        worklog[year].ent[month] = {
          timeSpent: 0,
          ent: {}
        };
      }
      if (!worklog[year].ent[month].ent[day]) {
        worklog[year].ent[month].ent[day] = {
          timeSpent: 0,
          ent: [],
          dateStr: dateStr,
          // id: this.Uid()
        };
      }
      worklog[year].ent[month].ent[day].timeSpent
        = worklog[year].ent[month].ent[day].timeSpent
        + task.timeSpentOnDay[dateStr];
      worklog[year].ent[month].timeSpent
        = worklog[year].ent[month].timeSpent
        + task.timeSpentOnDay[dateStr];
      worklog[year].timeSpent
        = worklog[year].timeSpent
        + task.timeSpentOnDay[dateStr];

      worklog[year].ent[month].ent[day].ent.push({
        task: task,
        isVisible: true,
        timeSpent: task.timeSpentOnDay[dateStr]
      });
    });
  });
  return worklog;
};


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
    console.log(completeState);
    this.worklog = mapArchiveToWorklog(completeState);
    console.log(this.worklog);

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

  createTasksForDay(data: any) {
    const tasks = [];
    const dayData = {...data};

    dayData.entries.forEach((entry) => {
      const task = entry.task;
      task.timeSpent = entry.timeSpent;
      task.dateStr = dayData.dateStr;
      tasks.push(task);
    });

    return tasks;
  }

  createTasksForMonth(data: any) {
    let tasks = [];
    const monthData = {...data};
    monthData.entries.forEach((entry) => {
      tasks = tasks.concat(this.createTasksForDay(entry));
    });
    return tasks;
  }
}
