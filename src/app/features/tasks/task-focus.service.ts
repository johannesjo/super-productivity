import { Injectable, signal } from '@angular/core';
import { TaskComponent } from './task/task.component';

@Injectable({
  providedIn: 'root',
})
export class TaskFocusService {
  readonly focusedTaskId = signal<string | null>(null);
  readonly lastFocusedTaskComponent = signal<TaskComponent | null>(null);
}
