import {Tag} from './tag.model';

import {AddTag, DeleteTag, LoadTagState, UpdateTag} from './store/tag.actions';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {select, Store} from '@ngrx/store';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {take} from 'rxjs/operators';
import {
  initialTagState,
  selectAllTags,
  selectTagById,
  selectTagByName,
  selectTagsByIds,
  TagState
} from './store/tag.reducer';
import shortid from 'shortid';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  public tags$: Observable<Tag[]> = this._store$.pipe(select(selectAllTags));

  constructor(
    private _store$: Store<TagState>,
    private _persistenceService: PersistenceService
  ) {
  }

  getById$(id: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagById, {id}), take(1));
  }

  getByIds$(ids: string[]): Observable<Tag[]> {
    return this._store$.pipe(select(selectTagsByIds, {ids}));
  }

  getByName$(name: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagByName, {name}));
  }

  async load() {
    const lsTagState = await this._persistenceService.taskTag.loadState() || initialTagState;
    this.loadState(lsTagState || initialTagState);
  }

  public loadState(state: TagState) {
    Object.keys(state.entities).forEach((k, i) => {
      if (!k) {
        delete state.entities[i];
        state.ids.splice(state.ids.indexOf(k as string & number), 1);
      }
    });
    this._store$.dispatch(new LoadTagState({state}));
  }

  public addTag(tag: Partial<Tag>): string {

    if (!tag.name) {
      console.error('Can\'t add an empty tag!');
      return;
    }

    const id = shortid();

    this._store$.dispatch(new AddTag({
      tag: {
        id,
        name: tag.name,
        created: Date.now(),
        modified: Date.now(),
        color: tag.color || '#FFDAB9',
        ...tag,
      }
    }));

    return id;
  }

  public removeTag(id: string) {
    this._store$.dispatch(new DeleteTag({id}));
  }

  public updateColor(id: string, color: string) {
    this._store$.dispatch(new UpdateTag({id, changes: {color}}));
  }

}
