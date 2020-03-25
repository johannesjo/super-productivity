import {Injectable} from '@angular/core';
import {PersistenceService} from '../persistence/persistence.service';
import {ProjectState} from '../../features/project/store/project.reducer';
import {forkJoin, Observable} from 'rxjs';
import {concatMap, map, take, tap} from 'rxjs/operators';
import {LS_TASK_ATTACHMENT_STATE, LS_TASK_STATE} from '../persistence/ls-keys.const';
import {TaskState} from 'src/app/features/tasks/task.model';
import {EntityState} from '@ngrx/entity';
import {TaskAttachment} from '../../features/tasks/task-attachment/task-attachment.model';
import {initialTaskState} from '../../features/tasks/store/task.reducer';

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
    console.log(projectState);

    return forkJoin([
      this._migrateTaskFromProjectToSingle$(ids).pipe(
        concatMap((taskState) => this._migrateTaskAttachmentsToTaskStates$(ids, taskState)),
        // concatMap((migratedTaskState: TaskState) => this._persistenceService.task.saveState(migratedTaskState)),
      ),
    ]).pipe(
      // concatMap(() => this._persistenceService.cleanDatabase()),
      concatMap(() => this._persistenceService.project.loadState())
    );
  }


  private _migrateTaskFromProjectToSingle$(projectIds: string[]): Observable<TaskState> {
    console.log(projectIds);
    return forkJoin(...projectIds.map(
      id => this._persistenceService.loadLegacyProjectModel(LS_TASK_STATE, id)
    )).pipe(
      tap((args) => console.log('TASK_BEFORE', args)),
      map((taskStates: TaskState[]) => taskStates.reduce(
        (acc, s) => {
          if (!s || !s.ids) {
            return acc;
          }
          return {
            ...acc,
            ids: [...acc.ids, ...s.ids],
            entities: {...acc.entities, ...s.entities}
          };
        }, initialTaskState)
      ),
      tap((args) => console.log('TASK_AFTER', args)),
    );
  }

  private _migrateTaskAttachmentsToTaskStates$(projectIds: string[], taskState: TaskState): Observable<any> {
    // LS_TASK_ATTACHMENT_STATE
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
        return taskState.ids.reduce((acc, id) => {
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

  // private _finalCleanup$() {
  // this._persistenceService.cleanDatabase()
  // }
}
