import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { selectAllTags, selectAllTagsWithoutMyDay, selectTagById, selectTagsByIds } from './store/tag.reducer';
import { addTag, deleteTag, deleteTags, updateTag, upsertTag } from './store/tag.actions';
import { Observable } from 'rxjs';
import { Tag, TagState } from './tag.model';
import * as shortid from 'shortid';
import { DEFAULT_TAG } from './tag.const';
import { TypedAction } from '@ngrx/store/src/models';

@Injectable({
  providedIn: 'root',
})
export class TagService {
  tags$: Observable<Tag[]> = this._store$.pipe(select(selectAllTags));
  tagsNoMyDay$: Observable<Tag[]> = this._store$.pipe(select(selectAllTagsWithoutMyDay));

  constructor(
    private _store$: Store<TagState>,
  ) {
  }

  getTagById$(id: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagById, {id}));
  }

  getTagsByIds$(ids: string[], isAllowNull: boolean = false): Observable<Tag[]> {
    return this._store$.pipe(select(selectTagsByIds, {ids, isAllowNull}));
  }

  addTag(tag: Partial<Tag>): string {
    const {id, action} = this.getAddTagActionAndId(tag);
    this._store$.dispatch(action);
    return id;
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

  getAddTagActionAndId(tag: Partial<Tag>): { action: TypedAction<any>; id: string } {
    const id = shortid();
    return {
      id, action: addTag({
        tag: {
          ...DEFAULT_TAG,
          id,
          title: tag.title || 'EMPTY',
          created: Date.now(),
          modified: Date.now(),
          icon: null,
          color: tag.color || null,
          taskIds: [],
          ...tag,
        }
      })
    };
  }
}
