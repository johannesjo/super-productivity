import { Injectable, signal } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';

@Injectable({ providedIn: 'root' })
export class ScheduleExternalDragService {
  private readonly _activeTask = signal<TaskWithSubTasks | null>(null);

  activeTask(): TaskWithSubTasks | null {
    return this._activeTask();
  }

  setActiveTask(task: TaskWithSubTasks | null): void {
    this._activeTask.set(task);
  }
}
