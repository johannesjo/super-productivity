import { inject, Injectable, WritableSignal } from '@angular/core';
import { combineLatest, forkJoin, from, Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  filter,
  first,
  map,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { TaskService } from '../task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { TagService } from '../../tag/tag.service';
import { ProjectService } from '../../project/project.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { ShortSyntaxTag, shortSyntaxToTags } from './short-syntax-to-tags';
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
import { assertTruthy } from '../../../util/assert-truthy';
import { DEFAULT_PROJECT_COLOR } from '../../work-context/work-context.const';

@Injectable({
  providedIn: 'root',
})
export class AddTaskBarService {
  private _taskService = inject(TaskService);
  private _workContextService = inject(WorkContextService);
  private _tagService = inject(TagService);
  private _projectService = inject(ProjectService);
  private _globalConfigService = inject(GlobalConfigService);
  private _snackService = inject(SnackService);
  private _issueService = inject(IssueService);

  getFilteredIssueSuggestions$(
    taskSuggestionsCtrl: UntypedFormControl,
    isSearchIssueProviders$: Observable<boolean>,
    isLoading: WritableSignal<boolean>,
  ): Observable<AddTaskSuggestion[]> {
    return taskSuggestionsCtrl.valueChanges.pipe(
      tap(() => {
        isLoading.set(false);
      }),
      debounceTime(300),
      tap(() => {
        isLoading.set(true);
      }),
      withLatestFrom(this._workContextService.activeWorkContextTypeAndId$),
      switchMap(([searchTerm, { activeType, activeId }]) =>
        isSearchIssueProviders$.pipe(
          switchMap((isIssueSearch) => {
            if (isIssueSearch) {
              if (!searchTerm?.length) {
                return of([]);
              }
              return this._issueService.searchAllEnabledIssueProviders$(searchTerm).pipe(
                map((issueSuggestions) =>
                  issueSuggestions.map(
                    (issueSuggestion) =>
                      ({
                        title: issueSuggestion.title,
                        titleHighlighted: issueSuggestion.titleHighlighted,
                        issueData: issueSuggestion.issueData,
                        issueType: issueSuggestion.issueType,
                        issueProviderId: issueSuggestion.issueProviderId,
                      }) as AddTaskSuggestion,
                  ),
                ),
                catchError(() => {
                  return of([]);
                }),
              );
            }

            return activeType === WorkContextType.PROJECT
              ? this._searchForProject$(searchTerm, activeId)
              : this._searchForTag$(searchTerm, activeId);
          }),
        ),
      ),
      tap(() => {
        isLoading.set(false);
      }),
      // don't show issues twice
      // NOTE: this only works because backlog items come first
      map((items: AddTaskSuggestion[]) =>
        items.reduce((unique: AddTaskSuggestion[], item: AddTaskSuggestion) => {
          return item.issueData &&
            unique.find(
              // NOTE: we check defined because we don't want to run into
              // false == false or similar
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
        this._tagService.tagsNoMyDayAndNoList$,
        this._projectService.list$,
        this._workContextService.activeWorkContext$,
        this._globalConfigService.shortSyntax$,
      ),
      map(([val, tags, projects, activeWorkContext, shortSyntaxConfig]) =>
        shortSyntaxToTags({
          val,
          tags,
          projects,
          defaultColor: activeWorkContext.theme.primary || DEFAULT_PROJECT_COLOR,
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
    isAddToBacklog: boolean,
    isAddToCurrentTag: boolean,
  ): Promise<string | undefined> {
    if (item.taskId && item.isFromOtherContextAndTagOnlySearch) {
      if (
        isAddToCurrentTag &&
        this._workContextService.activeWorkContextType === WorkContextType.TAG
      ) {
        const task = await this._taskService.getByIdOnce$(item.taskId).toPromise();
        this._taskService.moveToCurrentWorkContext(task);
      }
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
      if (!item.issueType || !item.issueData) {
        throw new Error('No issueData');
      }

      const res = await this._taskService.checkForTaskWithIssueEverywhere(
        item.issueData.id,
        item.issueType,
        this._workContextService.activeWorkContextId as string,
      );
      console.log(res);
      if (!res) {
        return await this._issueService.addTaskFromIssue({
          issueProviderKey: item.issueType,
          issueProviderId: assertTruthy(item.issueProviderId),
          issueDataReduced: assertTruthy(item.issueData),
          isAddToBacklog: isAddToBacklog,
        });
      } else if (res.isFromArchive) {
        this._taskService.restoreTask(res.task, res.subTasks || []);
        this._snackService.open({
          ico: 'info',
          msg: T.F.TASK.S.FOUND_RESTORE_FROM_ARCHIVE,
          translateParams: { title: res.task.title },
        });
        return res.task.id;
      } else if (res.task.projectId) {
        this._projectService.moveTaskToTodayList(res.task.id, res.task.projectId);
        this._snackService.open({
          ico: 'arrow_upward',
          msg: T.F.TASK.S.FOUND_MOVE_FROM_BACKLOG,
          translateParams: { title: res.task.title },
        });
        return res.task.id;
      } else {
        throw new Error('Weird add task case2');
      }
    }
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
              projectId: task.projectId,
              isFromOtherContextAndTagOnlySearch: true,
              tagIds: task.tagIds,
            })),
        ),
        switchMap((tasks) =>
          !!tasks.length
            ? forkJoin(
                tasks.map((task) => {
                  return from(this._getCtxForTaskSuggestion(task)).pipe(
                    first(),
                    map((ctx) => ({
                      ...task,
                      ctx: {
                        ...ctx,
                        icon: (ctx && ctx.icon) || null,
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
  }: AddTaskSuggestion): Promise<Project> {
    return await this._projectService.getByIdOnce$(projectId).toPromise();
  }
}
