import { ChangeDetectionStrategy, Component } from '@angular/core';
import { expandAnimation, expandFadeAnimation } from '../../ui/animations/expand.ani';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { WorklogService } from '../worklog/worklog.service';
import { SimpleCounterService } from '../simple-counter/simple-counter.service';
import { TaskService } from '../tasks/task.service';
import { Task } from '../tasks/task.model';
import { WorklogDataForDay, WorklogDay } from '../worklog/worklog.model';
import { T } from 'src/app/t.const';
import { KeyValue } from '@angular/common';

@Component({
  selector: 'quick-history',
  templateUrl: './quick-history.component.html',
  styleUrls: ['./quick-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation, expandFadeAnimation, fadeAnimation],
})
export class QuickHistoryComponent {
  visibility: boolean[] = [];
  T: typeof T = T;
  keys: (o: Record<string, unknown>) => string[] = Object.keys;

  constructor(
    public readonly worklogService: WorklogService,
    public readonly simpleCounterService: SimpleCounterService,
    private readonly _taskService: TaskService,
  ) {}

  sortDays(a: KeyValue<string, WorklogDay>, b: KeyValue<string, WorklogDay>): number {
    // avoid comparison by key (day) because a week may span across two months
    return a.value.dateStr.localeCompare(b.value.dateStr);
  }

  async updateTimeSpentTodayForTask(
    task: Task,
    dateStr: string,
    newVal: number | string,
  ): Promise<void> {
    await this._taskService.updateEverywhere(task.id, {
      timeSpentOnDay: {
        ...task.timeSpentOnDay,
        [dateStr]: +newVal,
      },
    });
    this.worklogService.refreshWorklog();
  }

  trackByDay(i: number, day: any): string {
    return day.key;
  }

  filterWorklogDataForDay(worklogDataForDay: WorklogDataForDay[]): WorklogDataForDay[] {
    return worklogDataForDay.filter(
      (entry) => entry.task.isDone || entry.timeSpent > 1000,
    );
  }

  trackByLogEntry(i: number, logEntry: WorklogDataForDay): string {
    return logEntry.task.id;
  }
}
