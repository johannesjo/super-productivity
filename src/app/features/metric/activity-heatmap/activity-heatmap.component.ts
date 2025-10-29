import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorklogService } from '../../worklog/worklog.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { TaskService } from '../../tasks/task.service';
import { TaskArchiveService } from '../../time-tracking/task-archive.service';
import { defer, from } from 'rxjs';
import { first, map, switchMap } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { TODAY_TAG } from '../../tag/tag.const';
import { Task } from '../../tasks/task.model';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { SnackService } from '../../../core/snack/snack.service';
import { GlobalConfigService } from '../../config/global-config.service';

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
  imports: [TranslatePipe, MatIconButton, MatTooltip, MatIcon],
})
export class ActivityHeatmapComponent {
  private readonly _worklogService = inject(WorklogService);
  private readonly _workContextService = inject(WorkContextService);
  private readonly _taskService = inject(TaskService);
  private readonly _taskArchiveService = inject(TaskArchiveService);
  private readonly _snackService = inject(SnackService);
  private readonly _globalConfigService = inject(GlobalConfigService);

  T: typeof T = T;
  weeks: WeekData[] = [];
  isSharing = signal(false);
  private readonly _activeWorkContextTitle = toSignal(
    this._workContextService.activeWorkContextTitle$,
    { initialValue: '' },
  );

  // Get first day of week setting (0 = Sunday, 1 = Monday, etc.)
  private readonly _firstDayOfWeek = computed(() => {
    return this._globalConfigService.misc()?.firstDayOfWeek ?? 1;
  });

  // Day labels adjusted for first day of week
  readonly dayLabels = computed(() => {
    const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const firstDay = this._firstDayOfWeek();
    return [...allDays.slice(firstDay), ...allDays.slice(0, firstDay)];
  });

  // Raw data signals
  private readonly _rawHeatmapData = toSignal(
    this._workContextService.activeWorkContext$.pipe(
      switchMap((context) => {
        // Special case: TODAY tag shows ALL data from all tasks
        if (context.id === TODAY_TAG.id) {
          // Use defer to ensure the Promise is created fresh each time
          return defer(() => from(this._loadAllTasks())).pipe(
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

  // Compute heatmap data - reacts to both data changes AND firstDayOfWeek setting changes
  heatmapData = computed(() => {
    const rawData = this._rawHeatmapData();
    const firstDay = this._firstDayOfWeek();

    if (!rawData || !rawData.dayMap) {
      return null;
    }

    // Rebuild the weeks grid with the current firstDayOfWeek setting
    return this._buildWeeksGrid(
      rawData.dayMap,
      rawData.startDate,
      rawData.endDate,
      firstDay,
    );
  });

  private async _loadAllTasks(): Promise<Task[]> {
    // Load both current tasks and archived tasks
    const [archive, currentTasks] = await Promise.all([
      this._taskArchiveService.load(),
      this._taskService.allTasks$.pipe(first()).toPromise(),
    ]);

    const allTasks: Task[] = [...(currentTasks || [])];

    // Add archived tasks (archive is a single TaskArchive object with all tasks)
    if (archive && archive.ids) {
      archive.ids.forEach((taskId) => {
        const archivedTask = archive.entities[taskId];
        if (archivedTask) {
          allTasks.push(archivedTask as Task);
        }
      });
    }

    return allTasks;
  }

  private _buildHeatmapDataFromTasks(tasks: Task[]): {
    dayMap: Map<string, DayData>;
    startDate: Date;
    endDate: Date;
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

    return {
      dayMap,
      startDate: oneYearAgo,
      endDate: now,
    };
  }

  private _buildHeatmapData(worklog: any): {
    dayMap: Map<string, DayData>;
    startDate: Date;
    endDate: Date;
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

    return {
      dayMap,
      startDate: oneYearAgo,
      endDate: now,
    };
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
    firstDayOfWeek: number = 0,
  ): { weeks: WeekData[]; monthLabels: string[] } {
    const weeks: WeekData[] = [];
    const monthLabels: string[] = [];
    let currentMonth = -1;

    // Find the first day (based on firstDayOfWeek setting) before or on the start date
    const firstDay = new Date(startDate);
    const dayOfWeek = firstDay.getDay();
    // Calculate days to go back to reach the first day of the week
    const daysToGoBack = (dayOfWeek - firstDayOfWeek + 7) % 7;
    firstDay.setDate(firstDay.getDate() - daysToGoBack);

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

  async shareHeatmap(): Promise<void> {
    const data = this.heatmapData();
    if (!data) {
      return;
    }

    this.isSharing.set(true);

    try {
      // Render heatmap to canvas
      const contextTitle = this._activeWorkContextTitle();
      const canvas = this._renderToCanvas(data, contextTitle);

      // Convert to blob
      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
      });

      if (!blob) {
        throw new Error('Failed to generate image');
      }

      const file = new File([blob], 'activity-heatmap.png', { type: 'image/png' });

      // Try native share API first
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Activity Heatmap',
        });
      } else {
        // Fallback: Download the file
        this._downloadFile(blob, 'activity-heatmap.png');
      }

      this._snackService.open({
        type: 'SUCCESS',
        msg: 'Heatmap shared successfully',
      });
    } catch (error: any) {
      // User cancelled or error occurred
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
        this._snackService.open({
          type: 'ERROR',
          msg: 'Failed to share heatmap',
        });
      }
    } finally {
      this.isSharing.set(false);
    }
  }

  private _renderToCanvas(
    data: {
      weeks: WeekData[];
      monthLabels: string[];
    },
    contextTitle: string,
  ): HTMLCanvasElement {
    const cellSize = 12;
    const gap = 2;
    const dayLabelWidth = 40;
    const monthLabelHeight = 20;
    const padding = 16;
    const weekHeight = 7 * (cellSize + gap);
    const doublePadding = padding * 2;
    const heatmapHeight = monthLabelHeight + weekHeight;
    const baseCanvasHeight = heatmapHeight + doublePadding;
    const taglineHeight = 32;

    // Calculate dimensions
    const numWeeks = data.weeks.length;
    const weeksWidth = numWeeks * (cellSize + gap);
    const canvasWidth = dayLabelWidth + weeksWidth + doublePadding;
    const canvasHeight = baseCanvasHeight + taglineHeight;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Day labels (Sun, Mon, etc.)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const dayNames = this.dayLabels();
    dayNames.forEach((day, i) => {
      // eslint-disable-next-line no-mixed-operators
      const y = padding + monthLabelHeight + i * (cellSize + gap) + cellSize / 2;
      ctx.fillText(day, padding + dayLabelWidth - 4, y);
    });

    // Month labels
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    data.monthLabels.forEach((month, i) => {
      // eslint-disable-next-line no-mixed-operators
      const x = padding + dayLabelWidth + i * 4 * (cellSize + gap);
      ctx.fillText(month, x, padding);
    });

    // Get primary color from CSS variable or use default
    const primaryColor =
      getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() ||
      '#3f51b5';

    // Draw heatmap cells
    data.weeks.forEach((week, weekIndex) => {
      week.days.forEach((day, dayIndex) => {
        if (day) {
          // eslint-disable-next-line no-mixed-operators
          const x = padding + dayLabelWidth + weekIndex * (cellSize + gap);
          // eslint-disable-next-line no-mixed-operators
          const y = padding + monthLabelHeight + dayIndex * (cellSize + gap);

          // Set color based on level
          if (day.level === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          } else {
            // Mix primary color with transparency
            const opacity = day.level * 0.2; // 0.2, 0.4, 0.6, 0.8, 1.0
            ctx.fillStyle = this._mixColor(primaryColor, opacity);
          }

          // Draw rounded rectangle
          this._roundRect(ctx, x, y, cellSize, cellSize, 2);
        }
      });
    });

    const normalizedTitle = contextTitle?.trim().length
      ? contextTitle.trim()
      : 'Super Productivity';
    const shareLabel = `${normalizedTitle} – With the Super Productivity App`;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const taglineOffset = taglineHeight / 2;
    const taglineY = baseCanvasHeight + taglineOffset;
    ctx.fillText(shareLabel, canvasWidth / 2, taglineY);

    return canvas;
  }

  private _mixColor(color: string, opacity: number): string {
    // Simple color mixing - assumes hex or rgb color
    if (color.startsWith('#')) {
      // Convert hex to rgb
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Assume it's already in rgb/rgba format
    return color.replace(
      /rgba?\([^)]+\)/,
      `rgba(${color.match(/\d+/g)?.slice(0, 3).join(',')}, ${opacity})`,
    );
  }

  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  private _downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
