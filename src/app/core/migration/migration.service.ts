import {Injectable} from '@angular/core';
import {PersistenceService} from '../persistence/persistence.service';
import {ProjectState} from '../../features/project/store/project.reducer';
import {forkJoin, Observable} from 'rxjs';
import {concatMap, map, take, tap} from 'rxjs/operators';
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

@Injectable({
  providedIn: 'root'
})
export class MigrationService {

  constructor(
    private _persistenceService: PersistenceService,
  ) {
  }

  migrate$(projectState: ProjectState): Observable<ProjectState> {
    const ids = projectState.ids as string[];
    console.log('projectState', projectState);
    console.log('projectIds', ids);
    const UPDATED_VERSION = 4;

    return forkJoin([
      this._migrateTaskFromProjectToSingle$(ids).pipe(
        concatMap((taskState) => this._migrateTaskAttachmentsToTaskStates$(ids, taskState)),
        // concatMap((migratedTaskState: TaskState) => this._persistenceService.task.saveState(migratedTaskState)),
      ),
      this._migrateTaskArchiveFromProjectToSingle$(ids).pipe(
        concatMap((taskArchiveState) => this._migrateTaskAttachmentsToTaskStates$(ids, taskArchiveState)),
        // concatMap((migratedTaskArchiveState: TaskState) => this._persistenceService.taskArchive.saveState(migratedTaskArchiveState)),
      ),
      this._migrateTaskRepeatFromProjectIntoSingle(ids).pipe(
        // concatMap((migratedTaskRepeatState: TaskState) => this._persistenceService.taskRepeat.saveState(migratedTaskRepeatState)),
      ),
    ]).pipe(
      // concatMap(() => this._persistenceService.cleanDatabase()),
      // concatMap(() => {
      //   const updatedState = {
      //     ...projectState,
      //     [MODEL_VERSION_KEY]: UPDATED_VERSION,
      //   };
      //   return from(this._persistenceService.project.saveState(updatedState)).pipe(mapTo(updatedState));
      // }),
      concatMap(() => this._persistenceService.project.loadState()),
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
        this._mergeEntities(taskRepeatStates, {ids: [], entities: {}}) as TaskRepeatCfgState
      ),
      tap((args) => console.log('TASK_REPEAT_CFG_AFTER', args)),
    );
  }


  private _migrateTaskAttachmentsToTaskStates$(projectIds: string[], taskState: TaskState | TaskArchive): Observable<TaskState | TaskArchive> {
    const allAttachments$ = forkJoin(...projectIds.map(
      id => this._persistenceService.loadLegacyProjectModel(LS_TASK_ATTACHMENT_STATE, id)
    )).pipe(
      tap((args) => console.log('TASK_ATTACHMENTS_FOUND', args)),
      map((taskStates: EntityState<TaskAttachment>[]) => taskStates.reduce(
        (acc, s) => {
          if (!s || !s.ids) {
            return acc;
          }
          return {
            ...acc,
            ids: [...acc.ids, ...s.ids],
            entities: {...acc.entities, ...s.entities}
          };
        }, {
          ids: [],
          entities: {}
        })
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
                attachments: attachmentIds.map(attachmentId => {
                  const result = allAttachments.entities[attachmentId];
                  if (!result) {
                    throw new Error('Attachment not found');
                  }
                  return result;
                })
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
