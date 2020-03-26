import {Injectable} from '@angular/core';
import {PersistenceService} from '../persistence/persistence.service';
import {ProjectState} from '../../features/project/store/project.reducer';
import {EMPTY, Observable, of} from 'rxjs';
import {TaskArchive, TaskState} from 'src/app/features/tasks/task.model';
import {Dictionary, EntityState} from '@ngrx/entity';
import {TaskAttachment} from '../../features/tasks/task-attachment/task-attachment.model';
import {TaskRepeatCfgState} from '../../features/task-repeat-cfg/task-repeat-cfg.model';
import {initialTaskRepeatCfgState} from '../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import {T} from '../../t.const';
import {TranslateService} from '@ngx-translate/core';
import {LegacyAppDataComplete} from './legacy-models';
import {LegacyPersistenceService} from './legacy-persistence.sevice';
import {AppDataComplete} from '../../imex/sync/sync.model';
import {initialTaskState} from '../../features/tasks/store/task.reducer';
import {initialTagState} from '../../features/tag/store/tag.reducer';
import {initialContextState} from '../../features/work-context/store/work-context.reducer';
import {Project} from '../../features/project/project.model';

interface TaskToProject {
  projectId: string;
  today: string[];
  backlog: string[];
}

const EMTPY_ENTITY = () => ({ids: [], entities: {}});

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

  migrateIfNecessaryToProjectState$(projectState: ProjectState, legacyAppDataComplete?: LegacyAppDataComplete): Observable<ProjectState | never> {
    const isNeedsMigration = (projectState && (!(projectState as any).__modelVersion || (projectState as any).__modelVersion <= 3));

    // if (isNeedsMigration) {
    //   const msg = this._translateService.instant(T.APP.UPDATE_MAIN_MODEL);
    //   const r = confirm(msg);
    //   if (r === true) {
    //     return legacyAppDataComplete
    //       ? this._migrate$(legacyAppDataComplete).pipe(
    //         concatMap(() => this._persistenceService.project.loadState()),
    //       )
    //       : from(this._legacyPersistenceService.loadCompleteLegacy()).pipe(
    //         concatMap((legacyData) => this._migrate$(legacyData)),
    //         concatMap(() => this._persistenceService.project.loadState()),
    //       );
    //   } else {
    //     alert(this._translateService.instant(T.APP.UPDATE_MAIN_MODEL_NO_UPDATE));
    //   }
    // }

    return isNeedsMigration
      ? EMPTY
      : of(projectState);
  }


  migrateIfNecessary(appDataComplete: LegacyAppDataComplete | AppDataComplete): AppDataComplete {
    const projectState = appDataComplete.project;
    const isNeedsMigration = (projectState && (!(projectState as any).__modelVersion || (projectState as any).__modelVersion <= 3));

    if (isNeedsMigration) {
      const legacyAppDataComplete = appDataComplete as LegacyAppDataComplete;
      const msg = this._translateService.instant(T.APP.UPDATE_MAIN_MODEL);
      const r = confirm(msg);
      if (r === true) {
        return this._migrate(legacyAppDataComplete);
      } else {
        alert(this._translateService.instant(T.APP.UPDATE_MAIN_MODEL_NO_UPDATE));
      }
    } else {
      return appDataComplete as AppDataComplete;
    }
  }

  private _migrate(legacyAppDataComplete: LegacyAppDataComplete): AppDataComplete {
    const ids = legacyAppDataComplete.project.ids as string[];
    console.log('projectState', legacyAppDataComplete);
    console.log('projectIds', ids);
    const UPDATED_VERSION = 4;

    const newAppData: AppDataComplete = {
      lastActiveTime: legacyAppDataComplete.lastActiveTime,
      archivedProjects: legacyAppDataComplete.archivedProjects,
      globalConfig: legacyAppDataComplete.globalConfig,
      reminders: legacyAppDataComplete.reminders,
      // new
      tag: initialTagState,
      context: initialContextState,
      // migrated
      project: this._migrateTaskListsFromTaskToProjectState(legacyAppDataComplete),
      taskRepeatCfg: this._migrateTaskRepeatFromProjectIntoSingle(legacyAppDataComplete),

      task: this._migrateTaskState(legacyAppDataComplete),
      taskArchive: this._migrateTaskArchiveState(legacyAppDataComplete),
    };

    return newAppData;
  }

  private _migrateTaskListsFromTaskToProjectState(legacyAppDataComplete: LegacyAppDataComplete): ProjectState {
    const projectStateBefore = legacyAppDataComplete.project;
    return {
      ...projectStateBefore,
      entities: (projectStateBefore.ids as string[]).reduce((acc, id): Dictionary<Project> => {
        const taskState = legacyAppDataComplete.task[id] || {};
        return {
          ...acc,
          [id]: {
            ...projectStateBefore.entities[id],
            taskIds: (taskState as any).todaysTaskIds || [],
            backlogTaskIds: (taskState as any).backlogTaskIds || [],
          } as Project
        };
      }, {})
    };
  }


  private _migrateTaskState(legacyAppDataComplete: LegacyAppDataComplete): TaskState {
    const singleState = this._migrateTaskFromProjectToSingle(legacyAppDataComplete);
    return this._migrateTaskAttachmentsToTaskStates(legacyAppDataComplete, singleState) as TaskState;
  }

  private _migrateTaskArchiveState(legacyAppDataComplete: LegacyAppDataComplete): TaskArchive {
    const singleState = this._migrateTaskArchiveFromProjectToSingle(legacyAppDataComplete);
    return this._migrateTaskAttachmentsToTaskStates(legacyAppDataComplete, singleState) as TaskArchive;
  }

  private _migrateTaskFromProjectToSingle(legacyAppDataComplete: LegacyAppDataComplete): TaskState {
    const pids = legacyAppDataComplete.project.ids as string[];
    const taskStates: TaskState[] = pids.map((id) => legacyAppDataComplete.task[id]);
    return this._mergeEntities(taskStates, initialTaskState) as TaskState;
  }

  private _migrateTaskArchiveFromProjectToSingle(legacyAppDataComplete: LegacyAppDataComplete): TaskArchive {
    const pids = legacyAppDataComplete.project.ids as string[];
    const taskStates: TaskArchive[] = pids.map((id) => legacyAppDataComplete.taskArchive[id]);
    return this._mergeEntities(taskStates, EMTPY_ENTITY()) as TaskArchive;
  }

  private _migrateTaskRepeatFromProjectIntoSingle(legacyAppDataComplete: LegacyAppDataComplete): TaskRepeatCfgState {
    const pids = legacyAppDataComplete.project.ids as string[];
    const taskStates: TaskRepeatCfgState[] = pids.map((id) => legacyAppDataComplete.taskRepeatCfg[id]);
    return this._mergeEntities(taskStates, initialTaskRepeatCfgState) as TaskRepeatCfgState;
  }


  private _migrateTaskAttachmentsToTaskStates(legacyAppDataComplete: LegacyAppDataComplete, taskState: (TaskState | TaskArchive)):
    TaskState | TaskArchive {
    const attachmentStates = Object.keys(legacyAppDataComplete.taskAttachment).map(id => legacyAppDataComplete.taskAttachment[id]);
    const allAttachmentState = this._mergeEntities(attachmentStates, initialTaskRepeatCfgState) as EntityState<TaskAttachment>;

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
                const result = allAttachmentState.entities[attachmentId];
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
