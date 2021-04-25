import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Note } from './note.model';
import { select, Store } from '@ngrx/store';
import { addNote, deleteNote, loadNoteState, updateNote, updateNoteOrder } from './store/note.actions';
import * as shortid from 'shortid';
import { initialNoteState, NoteState, selectAllNotes, selectNoteById } from './store/note.reducer';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { take } from 'rxjs/operators';
import { createFromDrop } from '../../core/drop-paste-input/drop-paste-input';
import { isImageUrl, isImageUrlSimple } from '../../util/is-image-url';
import { DropPasteInput } from '../../core/drop-paste-input/drop-paste.model';

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  public notes$: Observable<Note[]> = this._store$.pipe(select(selectAllNotes));

  constructor(
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {
  }

  getById$(id: string): Observable<Note> {
    return this._store$.pipe(select(selectNoteById, {id}), take(1));
  }

  async getByIdFromEverywhere(id: string, projectId: string): Promise<Note> {
    return await this._persistenceService.note.ent.getById(projectId, id);
  }

  public async loadStateForProject(projectId: string) {
    const notes = await this._persistenceService.note.load(projectId) || initialNoteState;
    this.loadState(notes);
  }

  public loadState(state: NoteState) {
    this._store$.dispatch(loadNoteState({state}));
  }

  public add(note: Partial<Note> = {}, isPreventFocus: boolean = false) {
    const id = shortid();

    this._store$.dispatch(addNote({
      note: {
        id,
        content: '',
        created: Date.now(),
        modified: Date.now(),
        ...note,
      },
      isPreventFocus,
    }));
  }

  public remove(id: string) {
    this._store$.dispatch(deleteNote({id}));
  }

  public update(id: string, note: Partial<Note>) {
    this._store$.dispatch(updateNote({
      note: {
        id,
        changes: note,
      }
    }));
  }

  public async updateFromDifferentWorkContext(workContextId: string, id: string, updates: Partial<Note>) {
    const noteState = await this._persistenceService.note.load(workContextId);
    const noteToUpdate = noteState.entities[id];
    if (noteToUpdate) {
      Object.assign(noteToUpdate, updates);
    } else {
      console.warn('Note not found while trying to update for different project');
    }
    return await this._persistenceService.note.save(workContextId, noteState, {isSyncModelChange: true});
  }

  public updateOrder(ids: string[]) {
    this._store$.dispatch(updateNoteOrder({ids}));
  }

  // REMINDER
  // --------
  createFromDrop(ev: DragEvent) {
    this._handleInput(createFromDrop(ev) as DropPasteInput, ev);
  }

  private async _handleInput(drop: DropPasteInput, ev: Event) {
    // properly not intentional so we leave
    if (!drop || !drop.path || drop.type === 'FILE') {
      return;
    }

    // don't intervene with text inputs
    const target = ev.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const note: Partial<Note> = {
      content: drop.path,
    };

    const isImg = isImageUrlSimple(drop.path) || await isImageUrl(drop.path);
    if (isImg) {
      note.imgUrl = drop.path;
    }

    this.add(note);

    ev.preventDefault();
    ev.stopPropagation();
  }
}
