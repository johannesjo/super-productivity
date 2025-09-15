import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TaskFocusService {
  readonly focusedTaskId = signal<string | null>(null);
}
