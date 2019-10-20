import Dexie from 'dexie';
import 'dexie-observable';
import {Injectable} from '@angular/core';
import {Task} from '../../features/tasks/task.model';
import {from, merge, Observable, Subject} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';
import {IDatabaseChange} from 'dexie-observable/api';
import {TaskClass} from './task.class';

enum Tables {
  'tasks' = 'tasks'
}

const storeCfg = [{
  name: 'tasks',
  // tslint:disable-next-line
  // fields: '++id, projectId, title, *subTaskIds, timeSpentOnDay, timeSpent, timeEstimate, created, isDone, notes, &issueId, issueType, parentId, attachmentIds, &reminderId, &repeatCfgId, _showSubTasksMode, _currentTab'
  fields: '++id, projectId, title, created, parentId, *subTaskIds',
  c: TaskClass,
}];

export type TaskTable = Dexie.Table<Task, string>;

@Injectable({
  providedIn: 'root',
})
export class DexieService extends Dexie {
  tasks: Ta;

  private _refresh$ = new Subject<IDatabaseChange[]>();

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
      this[val.name].mapToClass(val.c);
    });


    this.on('changes', (changes: IDatabaseChange[]) => {
      console.log(changes);
      this._refresh$.next(changes);

    });

    this.getTasks$().subscribe((v) => console.log('getTasks$()', v));

  }

  getTasks$(queryIn?: (table: TaskTable) => Promise<Task[]>): Observable<Task[]> {
    const query: (table: TaskTable) => Promise<Task[]> = queryIn || ((table) => table.toArray());

    return merge(
      from(query(this.tasks)),
      this._refresh$.pipe(
        filter(changes => this._isRefreshForTable(Tables.tasks, changes)),
        switchMap(() => query(this.tasks))
      )
    );
  }

  private _isRefreshForTable(tableName: Tables, changes: IDatabaseChange[]) {
    return !!changes.find(change => change.table === tableName);
  }
}
