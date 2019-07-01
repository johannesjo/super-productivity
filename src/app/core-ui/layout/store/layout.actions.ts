import {Action} from '@ngrx/store';

export enum LayoutActionTypes {
  ShowAddTaskBar = '[Layout] Show AddTaskBar',
  HideAddTaskBar = '[Layout] Hide AddTaskBar',
  ToggleAddTaskBar = '[Layout] Toggle AddTaskBar',
  ShowBookmarkBar = '[Layout] Show BookmarkBar',
  HideBookmarkBar = '[Layout] Hide BookmarkBar',
  ToggleBookmarkBar = '[Layout] Toggle BookmarkBar',
}

export class ShowAddTaskBar implements Action {
  readonly type = LayoutActionTypes.ShowAddTaskBar;
}

export class HideAddTaskBar implements Action {
  readonly type = LayoutActionTypes.HideAddTaskBar;
}

export class ToggleAddTaskBar implements Action {
  readonly type = LayoutActionTypes.ToggleAddTaskBar;
}

export class ShowBookmarkBar implements Action {
  readonly type = LayoutActionTypes.ShowBookmarkBar;
}

export class HideBookmarkBar implements Action {
  readonly type = LayoutActionTypes.HideBookmarkBar;
}

export class ToggleBookmarkBar implements Action {
  readonly type = LayoutActionTypes.ToggleBookmarkBar;
}

export type LayoutActions =
  ShowAddTaskBar | HideAddTaskBar | ToggleAddTaskBar
  | ShowBookmarkBar | HideBookmarkBar | ToggleBookmarkBar
  ;
