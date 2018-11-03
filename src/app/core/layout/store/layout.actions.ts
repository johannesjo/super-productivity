import { Action } from '@ngrx/store';

export enum LayoutActionTypes {
  ShowAddTaskBar = '[Layout] Show AddTaskBar',
  HideAddTaskBar = '[Layout] Hide AddTaskBar',
  ToggleAddTaskBar = '[Layout] Toggle AddTaskBar',
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

export type LayoutActions = ShowAddTaskBar | HideAddTaskBar | ToggleAddTaskBar;
