import { Injectable } from '@angular/core';
import { Action } from '@ngrx/store';

@Injectable({
  providedIn: 'root',
})
export class BeforeFinishDayService {
  private _actions: Action[] = [];

  constructor() {}

  addActionIfNotAddedAlready(actionToAdd: Action): void {
    if (!this._actions.find((a) => a.type === actionToAdd.type)) {
      this._actions.push(actionToAdd);
    }
  }

  removeActionType(actionTypeToRemove: string): void {
    this._actions = this._actions.filter((a) => a.type !== actionTypeToRemove);
  }

  async executeActions(): Promise<'SUCCESS' | false> {
    return 'SUCCESS';
  }
}
