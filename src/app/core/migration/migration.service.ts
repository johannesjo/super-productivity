import {Injectable} from '@angular/core';
import {PersistenceService} from '../persistence/persistence.service';
import {ProjectState} from '../../features/project/store/project.reducer';
import {concat, EMPTY, forkJoin, from, Observable, of} from 'rxjs';
import {concatMap, filter, map, mapTo, take, tap, toArray} from 'rxjs/operators';
import {
  LS_TASK_ARCHIVE,
  LS_TASK_ATTACHMENT_STATE,
  LS_TASK_REPEAT_CFG_STATE,
  LS_TASK_STATE
} from '../persistence/ls-keys.const';
import {TaskArchive, TaskState} from 'src/app/features/tasks/task.model';
import {EntityState} from '@ngrx/entity';
import {TaskAttachment} from '../../features/tasks/task-attachment/task-attachment.model';
import {initialTaskState} from '../../features/tasks/store/task.reducer';
import {TaskRepeatCfgState} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import {initialTaskRepeatCfgState} from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import {MODEL_VERSION_KEY} from '../../app.constants';
import {UpdateProject} from '../../features/project/store/project.actions';
import {T} from '../../t.const';
import {TranslateService} from '@ngx-translate/core';
import {LegacyAppDataComplete} from './legacy-models';
import {LegacyPersistenceService} from './legacy-persistence.sevice';
import {AppDataComplete} from '../../imex/sync/sync.model';

interface TaskToProject {
  projectId: string;
  today: string[];
  backlog: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MigrationService {


  constructor(
    private _persistenceService: PersistenceService,
    private _legacyPersistenceService: LegacyPersistenceService,
    private _translateService: TranslateService,
  ) {
  }

  migrateIfNecessary$(projectState: ProjectState, legacyAppDataComplete?: LegacyAppDataComplete): Observable<ProjectState | never> {
    const isNeedsMigration = (projectState && (!(projectState as any).__modelVersion || (projectState as any).__modelVersion <= 3));

    if (isNeedsMigration) {
      const msg = this._translateService.instant(T.APP.UPDATE_MAIN_MODEL);
      const r = confirm(msg);
      if (r === true) {
        return legacyAppDataComplete
          ? this._migrate$(legacyAppDataComplete).pipe(
            concatMap(() => this._persistenceService.project.loadState()),
          )
          : from(this._legacyPersistenceService.loadCompleteLegacy()).pipe(
            concatMap(() => this._migrate$(projectState)),
            concatMap(() => this._persistenceService.project.loadState()),
          );
      } else {
        alert(this._translateService.instant(T.APP.UPDATE_MAIN_MODEL_NO_UPDATE));
      }
    }

    return isNeedsMigration
      ? EMPTY
      : of(projectState);
  }


  private _migrate$(legacyAppDataComplete: LegacyAppDataComplete): Observable<AppDataComplete> {
    const ids = legacyAppDataComplete.project.ids as string[];
    console.log('projectState', legacyAppDataComplete);
    console.log('projectIds', ids);
    const UPDATED_VERSION = 4;

    // return forkJoin([
    return concat(
      this._migrateTaskListsFromTaskToProjectState$(ids).pipe(
        concatMap((taskListToPs: TaskToProject []) => forkJoin(
          taskListToPs
            .map(({backlog, today, projectId}) => this._persistenceService.project.execAction(new UpdateProject({
              project: {
                id: projectId,
                changes: {
                  backlogTaskIds: backlog || [],
                  taskIds: today || [],
                }
              }
            })))
        )),
      ),
      this._migrateTaskFromProjectToSingle$(ids).pipe(
        concatMap((taskState) => this._migrateTaskAttachmentsToTaskStates$(ids, taskState)),
        // concatMap((migratedTaskState: TaskState) => this._persistenceService.task.saveState(migratedTaskState)),
      ),
      this._migrateTaskArchiveFromProjectToSingle$(ids).pipe(
        concatMap((taskArchiveState) => this._migrateTaskAttachmentsToTaskStates$(ids, taskArchiveState)),
        // concatMap((migratedTaskArchiveState: TaskState) => this._persistenceService.taskArchive.saveState(migratedTaskArchiveState)),
      ),
      this._migrateTaskRepeatFromProjectIntoSingle(ids).pipe(
        concatMap((migratedTaskRepeatState: TaskRepeatCfgState) => this._persistenceService.taskRepeatCfg.saveState(migratedTaskRepeatState)),
      ),
    ).pipe(
      toArray(),
      concatMap(() => this._persistenceService.cleanDatabase()),
      concatMap(() => {
        const updatedState = {
          ...projectState,
          [MODEL_VERSION_KEY]: UPDATED_VERSION,
        };
        return from(this._persistenceService.project.saveState(updatedState)).pipe(mapTo(updatedState));
      }),
    );
  }


  private _migrateTaskListsFromTaskToProjectState$(projectIds: string[]): Observable<TaskToProject[]> {
    return forkJoin(...projectIds.map(
      id => from(this._persistenceService.loadLegacyProjectModel(LS_TASK_STATE, id)).pipe(
        filter(taskState => !!taskState),
        map((taskState: TaskState) => ({
          projectId: id,
          today: (taskState as any).todaysTaskIds,
          backlog: (taskState as any).backlogTaskIds
        }))
      )
    )).pipe(
      tap((args) => console.log('LIST_MIGRATE_META_MODEL', args)),
    );
  }

  private _migrateTaskFromProjectToSingle$(projectIds: string[]): Observable<TaskState> {
    return forkJoin(...projectIds.map(
      id => this._persistenceService.loadLegacyProjectModel(LS_TASK_STATE, id)
    )).pipe(
      tap((args) => console.log('TASK_BEFORE', args)),
      map((taskStates: TaskArchive[]) =>
        this._mergeEntities(taskStates, initialTaskState) as TaskState
      ),
      tap((args) => console.log('TASK_AFTER', args)),
    );
  }


  private _migrateTaskArchiveFromProjectToSingle$(projectIds: string[]): Observable<TaskArchive> {
    return forkJoin(...projectIds.map(
      id => this._persistenceService.loadLegacyProjectModel(LS_TASK_ARCHIVE, id)
    )).pipe(
      tap((args) => console.log('TASK_ARCHIVE_BEFORE', args)),
      map((taskArchiveStates: TaskArchive[]) =>
        this._mergeEntities(taskArchiveStates, {ids: [], entities: {}}) as TaskArchive
      ),
      tap((args) => console.log('TASK_ARCHIVE_AFTER', args)),
    );
  }

  private _migrateTaskRepeatFromProjectIntoSingle(projectIds: string[]): Observable<TaskRepeatCfgState> {
    return forkJoin(...projectIds.map(
      id => this._persistenceService.loadLegacyProjectModel(LS_TASK_REPEAT_CFG_STATE, id)
    )).pipe(
      tap((args) => console.log('TASK_REPEAT_CFG_BEFORE', args)),
      map((taskRepeatStates: TaskRepeatCfgState[]) =>
        this._mergeEntities(taskRepeatStates, initialTaskRepeatCfgState) as TaskRepeatCfgState
      ),
      tap((args) => console.log('TASK_REPEAT_CFG_AFTER', args)),
    );
  }


  private _migrateTaskAttachmentsToTaskStates$(projectIds: string[], taskState: TaskState | TaskArchive): Observable<TaskState | TaskArchive> {
    const allAttachments$ = forkJoin(...projectIds.map(
      id => this._persistenceService.loadLegacyProjectModel(LS_TASK_ATTACHMENT_STATE, id)
    )).pipe(
      tap((args) => console.log('ALL_TASK_ATTACHMENT_STATES', args)),
      map((attachmentStates: EntityState<TaskAttachment>[]) =>
        this._mergeEntities(attachmentStates, initialTaskRepeatCfgState) as EntityState<TaskAttachment>
      ),
    );

    console.log('TASK_BEFORE_ATTACHMENTS', taskState);
    return allAttachments$.pipe(
      take(1),
      map((allAttachments) => {
        return (taskState.ids as string[]).reduce((acc, id) => {
          const {attachmentIds, ...tEnt} = acc.entities[id] as any;
          return {
            ...acc,
            entities: {
              ...acc.entities,
              [id]: {
                ...tEnt,
                attachments: tEnt.attachments || (attachmentIds
                  ? attachmentIds.map(attachmentId => {
                    const result = allAttachments.entities[attachmentId];
                    if (!result) {
                      console.log('ATTACHMENT NOT FOUND: Will be removed', attachmentIds);
                      // throw new Error('Attachment not found');
                    } else {
                      console.log('ATTACHMENT FOUND', result.title);
                    }
                    return result;
                  }).filter(v => !!v)
                  : [])
              },
            }
          };
        }, taskState);
      }),
      tap((args) => console.log('TASK_AFTER_ATTACHMENT', args)),
    );
  }

  private _mergeEntities(states: EntityState<any>[], initial: EntityState<any>): EntityState<any> {
    return states.reduce(
      (acc, s) => {
        if (!s || !s.ids) {
          return acc;
        }
        return {
          ...acc,
          ids: [...acc.ids, ...s.ids] as string[],
          entities: {...acc.entities, ...s.entities}
        };
      }, initial
    );
  }
}
