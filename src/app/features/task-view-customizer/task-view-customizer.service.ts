import { Injectable, signal, inject } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { TaskWithSubTasks } from '../tasks/task.model';
import { selectAllProjects } from '../project/store/project.selectors';
import { selectAllTags } from './../tag/store/tag.reducer';
import { Store } from '@ngrx/store';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { toObservable } from '@angular/core/rxjs-interop';
import { computed } from '@angular/core';
import { getDbDateStr } from '../../util/get-db-date-str';

@Injectable({ providedIn: 'root' })
export class TaskViewCustomizerService {
  private store = inject(Store);

  public selectedSort = signal<string>('default');
  public selectedGroup = signal<string>('default');
  public selectedFilter = signal<string>('default');
  public filterInputValue = signal<string>('');

  isCustomized = computed(
    () =>
      this.selectedSort() !== 'default' ||
      this.selectedGroup() !== 'default' ||
      this.selectedFilter() !== 'default' ||
      !!this.filterInputValue(),
  );

  constructor() {
    this._initProjects();
    this._initTags();
  }

  private _allProjects: Project[] = [];
  private _projectsLoaded = false;
  private _allTags: Tag[] = [];
  private _tagsLoaded = false;

  private _initProjects(): void {
    if (!this._projectsLoaded) {
      this.store.select(selectAllProjects).subscribe((projects) => {
        this._allProjects = projects;
      });
      this._projectsLoaded = true;
    }
  }

  private _initTags(): void {
    if (!this._tagsLoaded) {
      this.store.select(selectAllTags).subscribe((tags) => {
        this._allTags = tags;
      });
      this._tagsLoaded = true;
    }
  }

  customizeUndoneTasks(
    undoneTasks$: Observable<TaskWithSubTasks[]>,
  ): Observable<{ list: TaskWithSubTasks[]; grouped?: any }> {
    return combineLatest([
      undoneTasks$,
      toObservable(this.selectedSort),
      toObservable(this.selectedGroup),
      toObservable(this.selectedFilter),
      toObservable(this.filterInputValue),
    ]).pipe(
      map(([undone, sort, group, filter, filterVal]) => {
        const filtered = this.applyFilter(undone, filter, filterVal);
        const sorted = this.applySort(filtered, sort);
        const grouped =
          group !== 'default' ? this.applyGrouping(sorted, group) : undefined;
        return { list: sorted, grouped };
      }),
    );
  }

  private applyFilter(
    tasks: TaskWithSubTasks[],
    filter: string,
    filterVal: string,
  ): TaskWithSubTasks[] {
    if (filter === 'default' || !filterVal) return tasks;
    switch (filter) {
      case 'tag':
        const tag = this._allTags.find(
          (t) => t.title.toLowerCase().trim() === filterVal.toLowerCase().trim(),
        );
        if (!tag) return [];
        return tasks.filter((task) => task.tagIds?.includes(tag.id));
      case 'project':
        const project = this._allProjects.find(
          (p) => p.title.toLowerCase().trim() === filterVal.toLowerCase().trim(),
        );
        if (!project) return [];
        return tasks.filter((task) => task.projectId === project.id);
      case 'scheduledDate':
        return tasks.filter((task) => {
          if (!task.dueDay) return false;

          const todayStr = getDbDateStr();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = getDbDateStr(tomorrow);

          switch (filterVal) {
            case 'today':
              return task.dueDay === todayStr;

            case 'tomorrow':
              return task.dueDay === tomorrowStr;

            case 'thisWeek': {
              const now = new Date();
              const endOfWeek = new Date(now);
              endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
              const endOfWeekStr = getDbDateStr(endOfWeek);
              // Note: String comparison works correctly here because dueDay is in YYYY-MM-DD format
              // which is lexicographically sortable. This avoids timezone conversion issues.
              return task.dueDay >= todayStr && task.dueDay <= endOfWeekStr;
            }

            case 'nextWeek': {
              const now = new Date();
              const startNextWeek = new Date(now);
              startNextWeek.setDate(now.getDate() + (7 - now.getDay()) + 1);
              const startNextWeekStr = getDbDateStr(startNextWeek);
              const endNextWeek = new Date(startNextWeek);
              endNextWeek.setDate(startNextWeek.getDate() + 6);
              const endNextWeekStr = getDbDateStr(endNextWeek);
              return task.dueDay >= startNextWeekStr && task.dueDay <= endNextWeekStr;
            }

            case 'thisMonth': {
              const now = new Date();
              const yearMonth = getDbDateStr(now).substring(0, 7); // YYYY-MM
              return task.dueDay.startsWith(yearMonth);
            }

            case 'nextMonth': {
              const now = new Date();
              const nextMonth = new Date(now);
              nextMonth.setMonth(now.getMonth() + 1);
              const yearMonth = getDbDateStr(nextMonth).substring(0, 7); // YYYY-MM
              return task.dueDay.startsWith(yearMonth);
            }

            default:
              return true;
          }
        });
      case 'estimatedTime':
        return tasks.filter((task) => task.timeEstimate >= +filterVal);
      case 'timeSpent':
        if (!filterVal || isNaN(+filterVal)) {
          return tasks; // Show all tasks if filterVal is empty or not a number
        }
        return tasks.filter((task) => {
          const spent = task.timeSpentOnDay
            ? Object.values(task.timeSpentOnDay).reduce((a, b) => a + b, 0)
            : 0;
          return spent >= +filterVal;
        });
      default:
        return tasks;
    }
  }

  private applySort(tasks: TaskWithSubTasks[], sort: string): TaskWithSubTasks[] {
    switch (sort) {
      case 'name':
        return [...tasks].sort((a, b) => a.title.localeCompare(b.title));
      case 'tag': {
        const getPrimaryTagTitle = (t: TaskWithSubTasks): string | null => {
          if (!t.tagIds || t.tagIds.length === 0) return null;
          const titles = t.tagIds
            .map((id) => this._allTags.find((tag) => tag.id === id)?.title)
            .filter((v): v is string => !!v);
          if (!titles.length) return null;
          titles.sort((a, b) => a.localeCompare(b));
          return titles[0];
        };
        return [...tasks].sort((a, b) => {
          const aTitle = getPrimaryTagTitle(a);
          const bTitle = getPrimaryTagTitle(b);
          if (aTitle && bTitle) {
            const cmp = aTitle.localeCompare(bTitle);
            return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
          }
          if (aTitle && !bTitle) return -1; // tasks with tags first
          if (!aTitle && bTitle) return 1;
          return a.title.localeCompare(b.title);
        });
      }
      case 'creationDate':
        return [...tasks].sort((a, b) => a.created - b.created);
      case 'scheduledDate':
        return [...tasks].sort((a, b) => {
          // For dueWithTime, use timestamp comparison
          if (a.dueWithTime && b.dueWithTime) {
            return a.dueWithTime - b.dueWithTime;
          }

          // Note: String comparison works correctly here because dueDay is in YYYY-MM-DD format
          // which is lexicographically sortable. This avoids timezone conversion issues.
          if (a.dueDay && b.dueDay) {
            // If both have dueDay, compare strings directly
            return a.dueDay.localeCompare(b.dueDay);
          }

          // Mixed cases: prioritize dueWithTime over dueDay
          if (a.dueWithTime && b.dueDay) return -1;
          if (a.dueDay && b.dueWithTime) return 1;

          // Handle null cases
          if (!a.dueWithTime && !a.dueDay && !b.dueWithTime && !b.dueDay) return 0;
          if (!a.dueWithTime && !a.dueDay) return 1;
          if (!b.dueWithTime && !b.dueDay) return -1;

          return 0;
        });
      case 'estimatedTime':
        return [...tasks].sort((a, b) => (a.timeEstimate || 0) - (b.timeEstimate || 0));
      case 'timeSpent':
        return [...tasks].sort((a, b) => {
          const aSpent = a.timeSpentOnDay
            ? Object.values(a.timeSpentOnDay).reduce((x, y) => x + y, 0)
            : 0;
          const bSpent = b.timeSpentOnDay
            ? Object.values(b.timeSpentOnDay).reduce((x, y) => x + y, 0)
            : 0;
          return aSpent - bSpent;
        });
      default:
        return tasks;
    }
  }

  private applyGrouping(
    tasks: TaskWithSubTasks[],
    group: string,
  ): Record<string, TaskWithSubTasks[]> {
    return tasks.reduce(
      (acc, task) => {
        if (group === 'tag') {
          if (task.tagIds && task.tagIds.length > 0) {
            task.tagIds.forEach((tagId) => {
              const tag = this._allTags.find((t) => t.id === tagId);
              const key = tag ? tag.title : 'Unknown tag';
              acc[key] = acc[key] || [];
              acc[key].push(task);
            });
          } else {
            acc['No tag'] = acc['No tag'] || [];
            acc['No tag'].push(task);
          }
        } else if (group === 'project') {
          const project = this._allProjects.find((p) => p.id === task.projectId);
          const key = project ? project.title : 'No project';
          acc[key] = acc[key] || [];
          acc[key].push(task);
        } else if (group === 'scheduledDate') {
          const key = task.dueDay || 'No date';
          acc[key] = acc[key] || [];
          acc[key].push(task);
        }
        return acc;
      },
      {} as Record<string, TaskWithSubTasks[]>,
    );
  }

  setSort(val: string): void {
    this.selectedSort.set(val);
  }
  setGroup(val: string): void {
    this.selectedGroup.set(val);
  }
  setFilter(val: string): void {
    this.selectedFilter.set(val);
    this.filterInputValue.set('');
  }
  setFilterInputValue(val: string): void {
    this.filterInputValue.set(val);
  }

  resetAll(): void {
    this.setSort('default');
    this.setGroup('default');
    this.setFilter('default');
    this.setFilterInputValue('');
  }
}
