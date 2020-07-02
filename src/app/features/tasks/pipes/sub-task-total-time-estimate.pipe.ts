import { Pipe, PipeTransform } from '@angular/core';
import { Task } from '../task.model';

@Pipe({
  name: 'subTaskTotalTimeEstimate'
})
export class SubTaskTotalTimeEstimatePipe implements PipeTransform {
  transform = getSubTasksTotalTimeEstimate;
}

export const getSubTasksTotalTimeEstimate = (subTasks: Task[]): number => {
  return subTasks && subTasks.length > 0
    ? subTasks.reduce((acc, task) => acc + task.timeEstimate, 0)
    : 0;
};
