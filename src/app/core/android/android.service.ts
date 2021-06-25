import { Injectable } from '@angular/core';
import { Task } from '../../features/tasks/task.model';
import { combineLatest, Observable } from 'rxjs';
import { TagService } from '../../features/tag/tag.service';
import { TaskService } from '../../features/tasks/task.service';
import { TODAY_TAG } from '../../features/tag/tag.const';
import { map, switchMap } from 'rxjs/operators';
import { androidInterface } from './android-interface';
import { DataInitService } from '../data-init/data-init.service';
import { ProjectService } from '../../features/project/project.service';
import { Project } from '../../features/project/project.model';
import { Tag } from '../../features/tag/tag.model';

interface TaskWithCategoryText extends Task {
  category: string;
  categoryHtml: string;
}

@Injectable({ providedIn: 'root' })
export class AndroidService {
  private _todayTagTasksFlat$: Observable<TaskWithCategoryText[]> =
    this._dataInitService.isAllDataLoadedInitially$.pipe(
      switchMap(() => this._tagService.getTagById$(TODAY_TAG.id)),
      switchMap((tag) => this._taskService.getByIdsLive$(tag.taskIds)),
      map(
        (tasks) =>
          tasks && tasks.sort((a, b) => (a.isDone === b.isDone ? 0 : a.isDone ? 1 : -1)),
      ),
      switchMap((tasks) =>
        combineLatest([this._tagService.tags$, this._projectService.list$]).pipe(
          map(([tags, projects]) => {
            return tasks
              .filter((task) => !!task)
              .map((task) => ({
                ...task,
                category: [
                  ...(task.projectId
                    ? [(projects.find((p) => p.id === task.projectId) as Project).title]
                    : []),
                  ...(task.tagIds.length
                    ? tags
                        .filter(
                          (tag) =>
                            tag.id !== TODAY_TAG.id && task.tagIds.includes(tag.id),
                        )
                        .map((tag) => tag.title)
                    : []),
                ].join(', '),
                categoryHtml: [
                  ...(task.projectId
                    ? [
                        this._getCategoryHtml(
                          projects.find((p) => p.id === task.projectId) as Project,
                        ),
                      ]
                    : []),
                  ...(task.tagIds.length
                    ? tags
                        .filter(
                          (tag) =>
                            tag.id !== TODAY_TAG.id && task.tagIds.includes(tag.id),
                        )
                        .map((tag) => this._getCategoryHtml(tag))
                    : []),
                ].join(' '),
              }));
          }),
        ),
      ),
    );

  constructor(
    private _dataInitService: DataInitService,
    private _tagService: TagService,
    private _taskService: TaskService,
    private _projectService: ProjectService,
  ) {
    // this._todayTagTasksFlat$.subscribe((v) => console.log('_todayTagTasksFlat$', v));
    // this._todayTagTasksFlat$.subscribe((tasks) => console.log(tasks.map((value, index) => value.isDone)));
  }

  init() {
    this._todayTagTasksFlat$.subscribe((tasks) => {
      androidInterface.updateTaskData(JSON.stringify(tasks));
    });
  }

  private _getCategoryHtml(projectOrTag: Project | Tag): string {
    const color = projectOrTag.theme.primary;
    return `<font color="${color}" style="font-size: 99px">⬤</font> ${projectOrTag.title} `;
  }
}
