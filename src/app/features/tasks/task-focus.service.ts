import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class TaskFocusService {
  private readonly _focusedTaskId = signal<string | null>(null);

  readonly focusedTaskId$: Observable<string | null> = toObservable(this._focusedTaskId);

  setFocusedTask(taskId: string | null): void {
    this._focusedTaskId.set(taskId);
  }

  getFocusedTaskId(): string | null {
    return this._focusedTaskId();
  }

  // Signal getter for components
  focusedTaskId(): string | null {
    return this._focusedTaskId();
  }
}
