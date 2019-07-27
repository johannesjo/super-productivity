import {Action} from '@ngrx/store';
import {Tag} from '../tag.model';
import {TagState} from './tag.reducer';
import {Update} from '@ngrx/entity';

export enum TagActionTypes {
  LoadTagState = '[Tag] Load Tag State',
  AddTag = '[Tag] Add Tag',
  DeleteTag = '[Tag] Delete Tag',
  UpdateTag = '[Tag] Update Tag'
}

export class LoadTagState implements Action {
  readonly type = TagActionTypes.LoadTagState;

  constructor(public payload: { state: TagState }) {
  }
}

export class AddTag implements Action {
  readonly type = TagActionTypes.AddTag;

  constructor(public payload: { tag: Tag}) {
  }
}

export class DeleteTag implements Action {
  readonly type = TagActionTypes.DeleteTag;

  constructor(public payload: { id: string }) {}
}

export class UpdateTag implements Action {
  readonly type = TagActionTypes.UpdateTag;

  constructor(public payload: Update<Tag>) {}
}

export type TagActions =
  LoadTagState
  | AddTag
  | DeleteTag
  | UpdateTag;
