import {Injectable} from '@angular/core';
import {of} from 'rxjs';
import {TaskService} from '../tasks/task.service';

@Injectable({
  providedIn: 'root'
})
export class IntelligentListService {
  intelligentLists$ = of(
    [
      {
        id: 'ALL',
        title: 'All Tasks',
        icon: 'wb_sunny',
        isTranslate: true,
        criteria: [
          {projects: 'ALL'}
        ]
      }
    ]);

  constructor(
    private taskService: TaskService,
  ) {
  }


  doneTasksForList() {

  }
}
