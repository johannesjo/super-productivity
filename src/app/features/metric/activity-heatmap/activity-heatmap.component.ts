import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorklogService } from '../../worklog/worklog.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../../tasks/task.service';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { from } from 'rxjs';
import { first, map, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { TODAY_TAG } from '../../tag/tag.const';
import { Task } from '../../tasks/task.model';

interface DayData {
  date: Date;
  dateStr: string;
  taskCount: number;
  timeSpent: number;
  level: number; // 0-4 for color intensity
}

interface WeekData {
  days: (DayData | null)[];
}

@Component({
  selector: 'activity-heatmap',
  templateUrl: './activity-heatmap.component.html',
  styleUrls: ['./activity-heatmap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MsToStringPipe, TranslatePipe],
})
export class ActivityHeatmapComponent {
  private readonly _worklogService = inject(WorklogService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _taskService = inject(TaskService);
  private readonly _taskArchiveService = inject(TaskArchiveService);

  T: typeof T = T;
  monthLabels: string[] = [];
  weeks: WeekData[] = [];

  // Compute heatmap data
  // NOTE: Reacts to work context changes
  // - For TODAY tag: shows ALL tasks from all projects/tags (current + archived)
  // - For other tags/projects: shows only tasks from that context
  heatmapData = toSignal(
    this._workContextService.activeWorkContext$.pipe(
      switchMap((context) => {
        // Special case: TODAY tag shows ALL data
        if (context.id === TODAY_TAG.id) {
          return from(this._loadAllTasks()).pipe(
            map((tasks) => this._buildHeatmapDataFromTasks(tasks)),
          );
        }

        // Normal case: use context-filtered worklog
        return this._worklogService.worklog$.pipe(
          map((worklog) => this._buildHeatmapData(worklog)),
        );
      }),
    ),
    { initialValue: null },
  );

  private async _loadAllTasks(): Promise<Task[]> {
    // Load both current tasks and archived tasks
    const [archive, currentTasks] = await Promise.all([
      this._taskArchiveService.load(),
      this._taskService.allTasks$.pipe(first()).toPromise(),
    ]);

    const allTasks: Task[] = [...(currentTasks || [])];

    // Add archived tasks from all projects
    if (archive) {
      Object.values(archive).forEach((projectArchive) => {
        if (projectArchive?.ids) {
          projectArchive.ids.forEach((taskId) => {
            const archivedTask = projectArchive.entities[taskId];
            if (archivedTask) {
              allTasks.push(archivedTask);
            }
          });
        }
      });
    }

    return allTasks;
  }

  private _buildHeatmapDataFromTasks(tasks: Task[]): {
    weeks: WeekData[];
    monthLabels: string[];
  } | null {
    const dayMap = new Map<string, DayData>();
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Initialize all days in the past year
    const currentDate = new Date(oneYearAgo);
    while (currentDate <= now) {
      const dateStr = this._getDateStr(currentDate);
      dayMap.set(dateStr, {
        date: new Date(currentDate),
        dateStr,
        taskCount: 0,
        timeSpent: 0,
        level: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Extract time spent data from all tasks
    let maxTasks = 0;
    let maxTime = 0;
    const taskCountPerDay = new Map<string, Set<string>>();

    tasks.forEach((task) => {
      if (task.timeSpentOnDay) {
        Object.keys(task.timeSpentOnDay).forEach((dateStr) => {
          const timeSpent = task.timeSpentOnDay[dateStr];
          const dayData = dayMap.get(dateStr);

          if (dayData && timeSpent > 0) {
            dayData.timeSpent += timeSpent;
            maxTime = Math.max(maxTime, dayData.timeSpent);

            // Track unique tasks per day
            if (!taskCountPerDay.has(dateStr)) {
              taskCountPerDay.set(dateStr, new Set());
            }
            taskCountPerDay.get(dateStr)!.add(task.id);
          }
        });
      }
    });

    // Update task counts
    taskCountPerDay.forEach((taskIds, dateStr) => {
      const dayData = dayMap.get(dateStr);
      if (dayData) {
        dayData.taskCount = taskIds.size;
        maxTasks = Math.max(maxTasks, dayData.taskCount);
      }
    });

    // Calculate levels (0-4) based on activity
    // Prioritize time spent (80%) over task count (20%)
    dayMap.forEach((day) => {
      if (day.taskCount === 0 && day.timeSpent === 0) {
        day.level = 0;
      } else {
        const taskRatio = maxTasks > 0 ? day.taskCount / maxTasks : 0;
        const timeRatio = maxTime > 0 ? day.timeSpent / maxTime : 0;
        // eslint-disable-next-line no-mixed-operators
        const combinedRatio = timeRatio * 0.8 + taskRatio * 0.2;

        if (combinedRatio > 0.75) {
          day.level = 4;
        } else if (combinedRatio > 0.5) {
          day.level = 3;
        } else if (combinedRatio > 0.25) {
          day.level = 2;
        } else {
          day.level = 1;
        }
      }
    });

    return this._buildWeeksGrid(dayMap, oneYearAgo, now);
  }

  private _buildHeatmapData(worklog: any): {
    weeks: WeekData[];
    monthLabels: string[];
  } | null {
    if (!worklog) {
      return null;
    }

    const dayMap = new Map<string, DayData>();
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Initialize all days in the past year
    const currentDate = new Date(oneYearAgo);
    while (currentDate <= now) {
      const dateStr = this._getDateStr(currentDate);
      dayMap.set(dateStr, {
        date: new Date(currentDate),
        dateStr,
        taskCount: 0,
        timeSpent: 0,
        level: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Extract data from worklog
    let maxTasks = 0;
    let maxTime = 0;

    Object.keys(worklog).forEach((yearKeyIN) => {
      const yearKey = +yearKeyIN;
      const year = worklog[yearKey];

      if (year && year.ent) {
        Object.keys(year.ent).forEach((monthKeyIN) => {
          const monthKey = +monthKeyIN;
          const month = year.ent[monthKey];

          if (month && month.ent) {
            Object.keys(month.ent).forEach((dayKeyIN) => {
              const dayKey = +dayKeyIN;
              const day = month.ent[dayKey];

              if (day) {
                const dateStr = day.dateStr;
                const existing = dayMap.get(dateStr);

                if (existing) {
                  const taskCount = day.logEntries.length;
                  const timeSpent = day.timeSpent;

                  existing.taskCount = taskCount;
                  existing.timeSpent = timeSpent;

                  maxTasks = Math.max(maxTasks, taskCount);
                  maxTime = Math.max(maxTime, timeSpent);
                }
              }
            });
          }
        });
      }
    });

    // Calculate levels (0-4) based on activity
    // Prioritize time spent (80%) over task count (20%)
    dayMap.forEach((day) => {
      if (day.taskCount === 0 && day.timeSpent === 0) {
        day.level = 0;
      } else {
        const taskRatio = maxTasks > 0 ? day.taskCount / maxTasks : 0;
        const timeRatio = maxTime > 0 ? day.timeSpent / maxTime : 0;
        // eslint-disable-next-line no-mixed-operators
        const combinedRatio = timeRatio * 0.8 + taskRatio * 0.2;

        if (combinedRatio > 0.75) {
          day.level = 4;
        } else if (combinedRatio > 0.5) {
          day.level = 3;
        } else if (combinedRatio > 0.25) {
          day.level = 2;
        } else {
          day.level = 1;
        }
      }
    });

    return this._buildWeeksGrid(dayMap, oneYearAgo, now);
  }

  private _getDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private _buildWeeksGrid(
    dayMap: Map<string, DayData>,
    startDate: Date,
    endDate: Date,
  ): { weeks: WeekData[]; monthLabels: string[] } {
    const weeks: WeekData[] = [];
    const monthLabels: string[] = [];
    let currentMonth = -1;

    // Find the first Sunday before or on the start date
    const firstDay = new Date(startDate);
    const dayOfWeek = firstDay.getDay();
    firstDay.setDate(firstDay.getDate() - dayOfWeek);

    // Build weeks
    const currentDate = new Date(firstDay);
    let weekCount = 0;

    while (currentDate <= endDate || weeks.length === 0) {
      const week: WeekData = { days: [] };

      // Add 7 days for this week
      for (let i = 0; i < 7; i++) {
        const dateStr = this._getDateStr(currentDate);
        const dayData = dayMap.get(dateStr);

        // Only include days within our range
        if (currentDate >= startDate && currentDate <= endDate) {
          week.days.push(dayData || null);

          // Track month changes for labels
          const month = currentDate.getMonth();
          if (month !== currentMonth && currentDate.getDate() <= 7 && weekCount > 0) {
            // Add month label at the start of the month
            const monthNames = [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ];
            monthLabels.push(monthNames[month]);
            currentMonth = month;
          } else if (monthLabels.length === 0 && weekCount === 0) {
            // Add first month
            const monthNames = [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ];
            monthLabels.push(monthNames[month]);
            currentMonth = month;
          }
        } else {
          week.days.push(null);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      weeks.push(week);
      weekCount++;

      // Safety limit
      if (weeks.length > 54) {
        break;
      }
    }

    return { weeks, monthLabels };
  }

  getDayClass(day: DayData | null): string {
    if (!day) {
      return 'day empty';
    }
    return `day level-${day.level}`;
  }

  getDayTitle(day: DayData | null): string {
    if (!day) {
      return '';
    }
    return `${day.dateStr}: ${day.taskCount} tasks, ${this._formatTime(day.timeSpent)}`;
  }

  private _formatTime(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
