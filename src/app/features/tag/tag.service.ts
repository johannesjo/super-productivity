import { Injectable } from '@angular/core';
import { Action, select, Store } from '@ngrx/store';
import {
  selectAllTags,
  selectAllTagsWithoutMyDayAndNoList,
  selectTagById,
  selectTagsByIds,
} from './store/tag.reducer';
import {
  addTag,
  deleteTag,
  deleteTags,
  updateTag,
  updateTagOrder,
  upsertTag,
} from './store/tag.actions';
import { Observable } from 'rxjs';
import { Tag, TagState } from './tag.model';
import { nanoid } from 'nanoid';
import { DEFAULT_TAG } from './tag.const';

@Injectable({
  providedIn: 'root',
})
export class TagService {
  tags$: Observable<Tag[]> = this._store$.pipe(select(selectAllTags));
  tagsNoMyDayAndNoList$: Observable<Tag[]> = this._store$.pipe(
    select(selectAllTagsWithoutMyDayAndNoList),
  );

  constructor(private _store$: Store<TagState>) {}

  getTagById$(id: string): Observable<Tag> {
    return this._store$.pipe(select(selectTagById, { id }));
  }

  getTagsByIds$(ids: string[], isAllowNull: boolean = false): Observable<Tag[]> {
    return this._store$.pipe(select(selectTagsByIds, { ids, isAllowNull }));
  }

  addTag(tag: Partial<Tag>): string {
    const { id, action } = this.getAddTagActionAndId(tag);
    this._store$.dispatch(action);
    return id;
  }

  deleteTag(id: string): void {
    this._store$.dispatch(deleteTag({ id }));
  }

  removeTag(id: string): void {
    this._store$.dispatch(deleteTag({ id }));
  }

  updateColor(id: string, color: string): void {
    this._store$.dispatch(updateTag({ tag: { id, changes: { color } } }));
  }

  updateOrder(ids: string[]): void {
    this._store$.dispatch(updateTagOrder({ ids }));
  }

  deleteTags(ids: string[]): void {
    this._store$.dispatch(deleteTags({ ids }));
  }

  updateTag(id: string, changes: Partial<Tag>): void {
    this._store$.dispatch(updateTag({ tag: { id, changes } }));
  }

  upsertTag(tag: Tag): void {
    this._store$.dispatch(upsertTag({ tag }));
  }

  getAddTagActionAndId(tag: Partial<Tag>): { action: Action<any>; id: string } {
    const id = nanoid();
    return {
      id,
      action: addTag({
        tag: {
          ...DEFAULT_TAG,
          id,
          title: tag.title || 'EMPTY',
          created: Date.now(),
          icon: null,
          color: tag.color || null,
          taskIds: [],
          ...tag,
        },
      }),
    };
  }
}
