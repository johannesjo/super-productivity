import { Pipe, PipeTransform } from '@angular/core';
import { Task } from '../task.model';

@Pipe({ name: 'subTaskTotalTimeSpent' })
export class SubTaskTotalTimeSpentPipe implements PipeTransform {
  transform: (value: Task[]) => number = getSubTasksTotalTimeSpent;
}

export const getSubTasksTotalTimeSpent = (subTasks: Task[]): number => {
  return subTasks && subTasks.length > 0
    ? subTasks.reduce((acc, task) => acc + task.timeSpent, 0)
    : 0;
};
