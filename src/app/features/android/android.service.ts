import { Injectable, inject } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { TagService } from '../tag/tag.service';
import { TaskService } from '../tasks/task.service';
import { TODAY_TAG } from '../tag/tag.const';
import { map, switchMap } from 'rxjs/operators';
import { DataInitService } from '../../core/data-init/data-init.service';
import { ProjectService } from '../project/project.service';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';

interface TaskForAndroidWidgetWithCategoryText {
  id: string;
  title: string;
  isDone: boolean;
  category: string;
  categoryHtml: string;
}

@Injectable({ providedIn: 'root' })
export class AndroidService {
  private _dataInitService = inject(DataInitService);
  private _tagService = inject(TagService);
  private _taskService = inject(TaskService);
  private _projectService = inject(ProjectService);

  private _todayTagTasksFlat$: Observable<TaskForAndroidWidgetWithCategoryText[]> =
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
                id: task.id,
                title: task.title,
                isDone: task.isDone,
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

  init(): void {
    // this._todayTagTasksFlat$.subscribe((tasks) => {
    //   androidInterface.updateTaskData(JSON.stringify(tasks));
    // });
  }

  private _getCategoryHtml(projectOrTag: Project | Tag): string {
    const color = projectOrTag.theme.primary;
    return `<font color="${color}" style="font-size: 99px">⬤</font> ${projectOrTag.title} `;
  }
}
