import { Injectable } from '@angular/core';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { concatMap, first } from 'rxjs/operators';
import { DataImportService } from '../../imex/sync/data-import.service';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { SyncTriggerService } from '../../imex/sync/sync-trigger.service';
import { unique } from '../../util/unique';
import { NoteService } from './note.service';
import { initialNoteState } from './store/note.reducer';
import { Note, NoteState } from './note.model';
import { MODEL_VERSION } from '../../core/model-version';

@Injectable({
  providedIn: 'root',
})
export class MigrateNoteService {
  constructor(
    private _noteService: NoteService,
    private _persistenceService: PersistenceService,
    private _dataImportService: DataImportService,
    private _syncTriggerService: SyncTriggerService,
  ) {}

  checkMigrate(): void {
    // TODO check for model version number instead
    this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$
      .pipe(
        first(),
        concatMap(() => this._noteService.state$),
        first(),
      )
      .subscribe(async (currentNoteState: NoteState) => {
        if (!currentNoteState[MODEL_VERSION_KEY]) {
          console.log('[M] Migrating Legacy Note State to new model');
          console.log('[M] noteMigration:', currentNoteState[MODEL_VERSION_KEY], {
            currentNoteState,
          });

          const projectState = await this._persistenceService.project.loadState();
          // For new instances
          if (!projectState?.ids?.length) {
            return;
          }
          let newNoteState = initialNoteState;
          const newProjectState = { ...projectState };

          for (const projectId of projectState.ids as string[]) {
            const legacyNoteStateForProject =
              await this._persistenceService.legacyNote.load(projectId);
            console.log(legacyNoteStateForProject);

            if (legacyNoteStateForProject && legacyNoteStateForProject.ids.length) {
              console.log('[M] noteMigration:', {
                legacyNoteStateForProject,
              });
              legacyNoteStateForProject.ids.forEach((id) => {
                const entity = legacyNoteStateForProject.entities[id] as Note;
                entity.projectId = projectId;
                entity.isPinnedToToday = false;
              });

              newNoteState = this._mergeNotesState(
                newNoteState,
                legacyNoteStateForProject,
              );

              // @ts-ignore
              newProjectState.entities[projectId].noteIds =
                legacyNoteStateForProject.ids || [];
            }
          }
          console.log('[M] noteMigration:', { newNoteState, newProjectState });

          await this._persistenceService.note.saveState(
            {
              ...newNoteState,
              [MODEL_VERSION_KEY]: MODEL_VERSION.NOTE,
            },
            { isSyncModelChange: false },
          );
          await this._persistenceService.project.saveState(newProjectState, {
            isSyncModelChange: false,
          });
          const data = await this._persistenceService.loadComplete();
          await this._dataImportService.importCompleteSyncData(data);
        }
      });
  }

  private _mergeNotesState(
    completeState: NoteState,
    legacyNoteStateForProject: NoteState,
  ): NoteState {
    const s = {
      ...completeState,
      // NOTE: we need to make them unique, because we're possibly merging multiple entities into one
      ids: unique([
        ...(completeState.ids as string[]),
        ...(legacyNoteStateForProject.ids as string[]),
      ]),
      entities: {
        ...completeState.entities,
        ...legacyNoteStateForProject.entities,
      },
    };

    return s;
  }
}
