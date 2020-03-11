import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {take} from 'rxjs/operators';
import {initialTagState, selectAllTags, selectTagById, selectTagByName, selectTagsByIds,} from './store/tag.reducer';
import {addTag, deleteTag, deleteTags, loadTagState, updateTag, upsertTag,} from './store/tag.actions';
import {Observable} from 'rxjs';
import {Tag, TagState} from './tag.model';
import shortid from 'shortid';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {WORK_CONTEXT_DEFAULT_COMMON} from '../work-context/work-context.const';
import {MY_DAY_TAG} from './tag.const';

@Injectable({
  providedIn: 'root',
})
export class TagService {
  tags$: Observable<Tag[]> = this._store$.pipe(select(selectAllTags));

  constructor(
    private _store$: Store<TagState>,
    private _persistenceService: PersistenceService,
  ) {
  }

  getTagById$(id: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagById, {id}), take(1));
  }

  getTagsById$(ids: string[]): Observable<Tag[]> {
    return this._store$.pipe(select(selectTagsByIds, {ids}), take(1));
  }

  getByName$(name: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagByName, {name}));
  }

  async load() {
    const lsTagState = await this._persistenceService.tag.loadState() || initialTagState;
    const state = this._addMyDayTag(lsTagState);
    this.loadState(state);
  }


  loadState(state: TagState) {
    this._store$.dispatch(loadTagState({state}));
  }

  addTag(tag: Tag) {
    this._store$.dispatch(addTag({
      tag: {
        id: shortid(),
        name: tag.name,
        created: Date.now(),
        modified: Date.now(),
        icon: null,
        color: tag.color || '#FFDAB9',
        ...WORK_CONTEXT_DEFAULT_COMMON,
        ...tag,
      }
    }));
  }

  deleteTag(id: string) {
    this._store$.dispatch(deleteTag({id}));
  }

  removeTag(id: string) {
    this._store$.dispatch(deleteTag({id}));
  }

  updateColor(id: string, color: string) {
    this._store$.dispatch(updateTag({tag: {id, changes: {color}}}));
  }

  deleteTags(ids: string[]) {
    this._store$.dispatch(deleteTags({ids}));
  }

  updateTag(id: string, changes: Partial<Tag>) {
    this._store$.dispatch(updateTag({tag: {id, changes}}));
  }

  upsertTag(tag: Tag) {
    this._store$.dispatch(upsertTag({tag}));
  }

  private _addMyDayTag(state: TagState): TagState {
    const ids = state.ids as string[];
    if (ids && !ids.includes(MY_DAY_TAG.id)) {
      return {
        ...state,
        ids: ([MY_DAY_TAG.id, ...ids] as string[]),
        entities: {
          ...state.entities,
          [MY_DAY_TAG.id]: MY_DAY_TAG,
        }
      };
    }
    return state;
  }
}
