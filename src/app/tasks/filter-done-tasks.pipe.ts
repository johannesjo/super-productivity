import { Pipe, PipeTransform } from '@angular/core';
import { TaskWithSubTasks } from './task.model';

@Pipe({
  name: 'filterDoneTasks'
})
export class FilterDoneTasksPipe implements PipeTransform {

  transform(tasks: TaskWithSubTasks[], isFilter: boolean): any {
    return isFilter
      ? tasks.filter(task => !task.isDone)
      : tasks;
  }
}
