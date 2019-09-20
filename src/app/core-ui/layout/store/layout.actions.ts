import {Action} from '@ngrx/store';

export enum LayoutActionTypes {
  ShowAddTaskBar = '[Layout] Show AddTaskBar',
  HideAddTaskBar = '[Layout] Hide AddTaskBar',
  ToggleAddTaskBar = '[Layout] Toggle AddTaskBar',
  ToggleSideBar = '[Layout] Toggle SideBar',
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

export class ToggleSideBar implements Action {
  readonly type = LayoutActionTypes.ToggleSideBar;
}

export type LayoutActions =
  ShowAddTaskBar | HideAddTaskBar | ToggleAddTaskBar
  | ToggleSideBar
  ;
