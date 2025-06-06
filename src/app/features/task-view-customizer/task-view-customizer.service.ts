import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { TaskWithSubTasks } from '../tasks/task.model';
import { selectAllProjects } from '../project/store/project.selectors';
import { selectAllTags } from './../tag/store/tag.reducer';
import { Store } from '@ngrx/store';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';

@Injectable({ providedIn: 'root' })
export class TaskViewCustomizerService {
  public selectedSort$ = new BehaviorSubject<string>('default');
  public selectedGroup$ = new BehaviorSubject<string>('default');
  public selectedFilter$ = new BehaviorSubject<string>('default');
  public filterInputValue$ = new BehaviorSubject<string>('');

  constructor(private store: Store) {
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
      this.selectedSort$,
      this.selectedGroup$,
      this.selectedFilter$,
      this.filterInputValue$,
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

          const due = new Date(task.dueDay);
          const now = new Date();

          switch (filterVal) {
            case 'today':
              return due.toDateString() === now.toDateString();

            case 'tomorrow': {
              const tomorrow = new Date();
              tomorrow.setDate(now.getDate() + 1);
              return due.toDateString() === tomorrow.toDateString();
            }

            case 'thisWeek': {
              const todayStart = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                0,
                0,
                0,
                0,
              );
              const endOfWeek = new Date(now);
              endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
              endOfWeek.setHours(23, 59, 59, 999);
              return due >= todayStart && due <= endOfWeek;
            }

            case 'nextWeek': {
              const startNextWeek = new Date(now);
              startNextWeek.setDate(now.getDate() + (7 - now.getDay()) + 1);
              const endNextWeek = new Date(startNextWeek);
              endNextWeek.setDate(startNextWeek.getDate() + 6);
              return due >= startNextWeek && due <= endNextWeek;
            }

            case 'thisMonth':
              return (
                due.getFullYear() === now.getFullYear() &&
                due.getMonth() === now.getMonth()
              );

            case 'nextMonth': {
              const nextMonth = new Date(now);
              nextMonth.setMonth(now.getMonth() + 1);
              return (
                due.getFullYear() === nextMonth.getFullYear() &&
                due.getMonth() === nextMonth.getMonth()
              );
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
      case 'creationDate':
        return [...tasks].sort((a, b) => a.created - b.created);
      case 'scheduledDate':
        return [...tasks].sort((a, b) => {
          // prettier-ignore
          const aDate = a.dueWithTime ? new Date(a.dueWithTime) : (a.dueDay ? new Date(a.dueDay) : null);
          // prettier-ignore
          const bDate = b.dueWithTime ? new Date(b.dueWithTime) : (b.dueDay ? new Date(b.dueDay) : null);

          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;

          return aDate.getTime() - bDate.getTime();
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
    this.selectedSort$.next(val);
  }
  setGroup(val: string): void {
    this.selectedGroup$.next(val);
  }
  setFilter(val: string, input: string): void {
    this.selectedFilter$.next(val);
    this.filterInputValue$.next(input);
  }

  getSort(): string {
    return this.selectedSort$.getValue();
  }
  getGroup(): string {
    return this.selectedGroup$.getValue();
  }
  getFilter(): string {
    return this.selectedFilter$.getValue();
  }
  getFilterInputValue(): string {
    return this.filterInputValue$.getValue();
  }
}
