import {Injectable} from '@angular/core';
import {Task} from '../../features/tasks/task.model';
import {Observable} from 'rxjs';
import {TagService} from '../../features/tag/tag.service';
import {TaskService} from '../../features/tasks/task.service';
import {TODAY_TAG} from '../../features/tag/tag.const';
import {filter, switchMap} from 'rxjs/operators';
import {androidInterface} from './android-interface';

@Injectable({
  providedIn: 'root'
})
export class AndroidService {
  private _todayTagTasksFlat$: Observable<Task[]> = this._tagService.getTagById$(TODAY_TAG.id).pipe(
    filter(tag => !!tag),
    switchMap(tag => this._taskService.getByIdsLive$(tag.taskIds))
  );

  constructor(
    private _tagService: TagService,
    private _taskService: TaskService,
  ) {
  }

  init() {
    this._todayTagTasksFlat$.subscribe(tasks => {
      androidInterface.updateTaskData(JSON.stringify(tasks));
    });
  }
}
