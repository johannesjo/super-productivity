import { Injectable } from '@angular/core';
import { combineLatest, forkJoin, from, Observable, of } from 'rxjs';
import {
  debounceTime,
  filter,
  first,
  map,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs/operators';
import { TaskService } from '../task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { TagService } from '../../tag/tag.service';
import { ProjectService } from '../../project/project.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { ShortSyntaxTag, shortSyntaxToTags } from './short-syntax-to-tags';
import { Tag } from '../../tag/tag.model';
import { Project } from '../../project/project.model';
import { MentionConfig, Mentions } from 'angular-mentions/lib/mention-config';
import { UntypedFormControl } from '@angular/forms';
import { WorkContextType } from '../../work-context/work-context.model';
import { Task } from '../task.model';
import { AddTaskSuggestion } from './add-task-suggestions.model';
import { truncate } from '../../../util/truncate';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';
import { IssueService } from '../../issue/issue.service';

@Injectable({
  providedIn: 'root',
})
export class AddTaskBarService {
  constructor(
    private _taskService: TaskService,
    private _workContextService: WorkContextService,
    private _tagService: TagService,
    private _projectService: ProjectService,
    private _globalConfigService: GlobalConfigService,
    private _snackService: SnackService,
    private _issueService: IssueService,
  ) {}

  getFilteredIssueSuggestions$(
    taskSuggestionsCtrl: UntypedFormControl,
  ): Observable<AddTaskSuggestion[]> {
    return taskSuggestionsCtrl.valueChanges.pipe(
      debounceTime(300),
      withLatestFrom(this._workContextService.activeWorkContextTypeAndId$),
      switchMap(([searchTerm, { activeType, activeId }]) =>
        activeType === WorkContextType.PROJECT
          ? this._searchForProject$(searchTerm, activeId)
          : this._searchForTag$(searchTerm, activeId),
      ),
      map((items: AddTaskSuggestion[]) =>
        items.reduce((unique: AddTaskSuggestion[], item: AddTaskSuggestion) => {
          return item.issueData &&
            unique.find(
              (u) =>
                !!u.taskIssueId &&
                !!item.issueData &&
                u.taskIssueId === item.issueData.id,
            )
            ? unique
            : [...unique, item];
        }, []),
      ),
    );
  }

  getShortSyntaxTags$(
    taskSuggestionsCtrl: UntypedFormControl,
  ): Observable<ShortSyntaxTag[]> {
    return taskSuggestionsCtrl.valueChanges.pipe(
      filter((val) => typeof val === 'string'),
      withLatestFrom(
        this._tagService.tags$,
        this._projectService.list$,
        this._workContextService.activeWorkContext$,
        this._globalConfigService.shortSyntax$,
      ),
      map(([val, tags, projects, activeWorkContext, shortSyntaxConfig]) =>
        shortSyntaxToTags({
          val,
          tags,
          projects,
          defaultColor: activeWorkContext.theme.primary,
          shortSyntaxConfig,
        }),
      ),
      startWith([]),
    );
  }

  getMentionConfig$(): Observable<MentionConfig> {
    return combineLatest([
      this._globalConfigService.shortSyntax$,
      this._tagService.tagsNoMyDayAndNoList$,
      this._projectService.list$.pipe(map((ps) => ps.filter((p) => !p.isHiddenFromMenu))),
    ]).pipe(
      map(([cfg, tagSuggestions, projectSuggestions]) => {
        const mentions: Mentions[] = [];
        if (cfg.isEnableTag) {
          mentions.push({ items: tagSuggestions, labelKey: 'title', triggerChar: '#' });
        }
        if (cfg.isEnableProject) {
          mentions.push({
            items: projectSuggestions,
            labelKey: 'title',
            triggerChar: '+',
          });
        }
        return { mentions };
      }),
    );
  }

  async addTaskFromExistingTaskOrIssue(
    item: AddTaskSuggestion,
  ): Promise<string | undefined> {
    if (item.taskId && item.isFromOtherContextAndTagOnlySearch) {
      const task = await this._taskService.getByIdOnce$(item.taskId).toPromise();
      this._taskService.updateTags(task, [
        ...task.tagIds,
        this._workContextService.activeWorkContextId as string,
      ]);

      this._snackService.open({
        ico: 'playlist_add',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_OTHER_LIST,
        translateParams: {
          title: truncate(item.title),
          contextTitle:
            item.ctx && item.ctx.title ? truncate(item.ctx.title) : '~the void~',
        },
      });
      return item.taskId;
    } else if (item.taskId) {
      if (!item.projectId) {
        console.log(item);
        throw new Error('Weird add task case1');
      }
      this._projectService.moveTaskToTodayList(item.taskId, item.projectId);
      this._snackService.open({
        ico: 'arrow_upward',
        msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
        translateParams: { title: item.title },
      });
      return item.taskId;
    } else {
      // if (!item.issueType || !item.issueData) {
      //   throw new Error('No issueData');
      // }
      // const res = await this._taskService.checkForTaskWithIssueInProject(
      //   item.issueData.id,
      //   item.issueType,
      //   this._workContextService.activeWorkContextId as string,
      // );
      // if (!res) {
      //   this._lastAddedTaskId = await this._issueService.addTaskWithIssue(
      //     item.issueType,
      //     item.issueData.id,
      //     this._workContextService.activeWorkContextId as string,
      //     this.isAddToBacklog,
      //   );
      // } else if (res.isFromArchive) {
      //   this._lastAddedTaskId = res.task.id;
      //   this._taskService.restoreTask(res.task, res.subTasks || []);
      //   this._snackService.open({
      //     ico: 'info',
      //     msg: T.F.TASK.S.FOUND_RESTORE_FROM_ARCHIVE,
      //     translateParams: { title: res.task.title },
      //   });
      // } else if (res.task.projectId) {
      //   this._lastAddedTaskId = res.task.id;
      //   this._projectService.moveTaskToTodayList(res.task.id, res.task.projectId);
      //   this._snackService.open({
      //     ico: 'arrow_upward',
      //     msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
      //     translateParams: { title: res.task.title },
      //   });
      // } else {
      //   throw new Error('Weird add task case2');
      // }
    }
    return undefined;
  }

  private _searchForProject$(
    searchTerm: string,
    projectId: string,
  ): Observable<AddTaskSuggestion[]> {
    if (searchTerm && searchTerm.length > 0) {
      return this._workContextService.backlogTasks$.pipe(
        map((tasks) =>
          tasks
            .filter((task) => this._filterBacklog(searchTerm, task))
            .map((task) => ({
              title: task.title,
              taskId: task.id,
              projectId,
              taskIssueId: task.issueId || undefined,
              issueType: task.issueType || undefined,
            })),
        ),
      );
    } else {
      return of([]);
    }
  }

  private _searchForTag$(
    searchTerm: string,
    currentTagId: string,
  ): Observable<AddTaskSuggestion[]> {
    if (searchTerm && searchTerm.length > 0) {
      return this._taskService.getAllParentWithoutTag$(currentTagId).pipe(
        take(1),
        map((tasks) =>
          tasks
            .filter((task) => this._filterBacklog(searchTerm, task))
            .map((task) => ({
              title: task.title,
              taskId: task.id,
              taskIssueId: task.issueId || undefined,
              issueType: task.issueType || undefined,
              projectId: task.projectId || undefined,
              isFromOtherContextAndTagOnlySearch: true,
              tagIds: task.tagIds,
            })),
        ),
        switchMap((tasks) =>
          !!tasks.length
            ? forkJoin(
                tasks.map((task) => {
                  const isFromProject = !!task.projectId;
                  return from(this._getCtxForTaskSuggestion(task)).pipe(
                    first(),
                    map((ctx) => ({
                      ...task,
                      ctx: {
                        ...ctx,
                        icon:
                          (ctx && (ctx as Tag).icon) || (isFromProject && 'list') || null,
                      },
                    })),
                  );
                }),
              )
            : of([]),
        ),
      );
    } else {
      return of([]);
    }
  }

  private _filterBacklog(searchText: string, task: Task): boolean {
    try {
      return !!task.title.toLowerCase().match(searchText.toLowerCase());
    } catch (e) {
      console.warn('RegEx Error', e);
      return false;
    }
  }

  private async _getCtxForTaskSuggestion({
    projectId,
    tagIds,
  }: AddTaskSuggestion): Promise<Tag | Project> {
    if (projectId) {
      return await this._projectService.getByIdOnce$(projectId).toPromise();
    } else {
      const firstTagId = (tagIds as string[])[0];
      if (!firstTagId) {
        throw new Error('No first tag');
      }
      return await this._tagService.getTagById$(firstTagId).pipe(first()).toPromise();
    }
  }
}
