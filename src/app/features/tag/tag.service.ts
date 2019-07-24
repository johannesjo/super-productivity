import {Tag} from './tag.model';

import {AddTag, DeleteTag, LoadTagState} from './store/tag.actions';
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
import {TaskService} from '../tasks/task.service';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  public tags$: Observable<Tag[]> = this._store$.pipe(select(selectAllTags));

  constructor(
    private _store$: Store<TagState>,
    private _persistenceService: PersistenceService
  ) {}

  getById$(id: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagById, {id}), take(1));
  }

  getByIds$(ids: string[]): Observable<Tag[]> {
    return this._store$.pipe(select(selectTagsByIds, {ids}));
  }

  getByName$(name: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagByName, {name}));
  }

  public async loadStateForProject(projectId) {
    const lsTagState = await this._persistenceService.taskTag.load(projectId) || initialTagState;
    this.loadState(lsTagState || initialTagState);
  }

  public loadState(state: TagState) {
    this._store$.dispatch(new LoadTagState({state}));
  }

  public addTag(tag: Partial<Tag>): string {

    if ( !tag.name ) {
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
        color: tag.color || '#000',
        ...tag,
      }
    }));

    return id;
  }

  public removeTag(id: string) {
    this._store$.dispatch(new DeleteTag({id}));
  }

}
