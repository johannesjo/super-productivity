import Dexie from 'dexie';
import 'dexie-observable';
import {Injectable} from '@angular/core';
import {Task} from '../../features/tasks/task.model';
import {from, merge, Observable, Subject} from 'rxjs';
import {switchMap} from 'rxjs/operators';

const storeCfg = [{
  name: 'tasks',
  fields: '++id, projectId, title, *subTaskIds, timeSpentOnDay, timeSpent, timeEstimate, created, isDone, notes, &issueId, issueType, parentId, attachmentIds, &reminderId, &repeatCfgId, _showSubTasksMode, _currentTab'
}];

export type TaskTable = Dexie.Table<Task, string>;

@Injectable({
  providedIn: 'root',
})
export class DexieService extends Dexie {
  tasks: TaskTable;
  private _taskRefresh$ = new Subject();

  constructor() {
    super('SUP_DEXIE');
    const schema = storeCfg.reduce((acc, item) => ({
      ...acc,
      [item.name]: item.fields
    }), {});
    console.log(schema);

    this.version(1).stores(schema);

    storeCfg.forEach((val) => {
      this[val.name] = this.table(val.name);
    });

    this.on('changes', (changes: any) => {
      console.log(changes);
      if (changes.find(change => change.table === 'tasks')) {
        this._taskRefresh$.next();
      }
    });

    this.getTasks$().subscribe((v) => console.log('getTasks$()', v));

  }

  getTasks$(queryIn?: (table: TaskTable) => Promise<Task[]>): Observable<Task[]> {
    const query: (table: TaskTable) => Promise<Task[]> = queryIn || ((table) => table.toArray());

    return merge(
      from(query(this.tasks)),
      this._taskRefresh$.pipe(
        switchMap(() => query(this.tasks))
      )
    );
  }
}
