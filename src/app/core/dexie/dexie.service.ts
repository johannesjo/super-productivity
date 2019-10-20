import Dexie from 'dexie';
import 'dexie-observable';
import {Injectable} from '@angular/core';
import {Task} from '../../features/tasks/task.model';

const storeCfg = [{
  name: 'tasks',
  fields: '++id, projectId, title, subTaskIds, timeSpentOnDay, timeSpent, timeEstimate, created, isDone, notes, issueId, issueType, parentId, attachmentIds, reminderId, repeatCfgId, _showSubTasksMode, _currentTab'
  // fields: '++id'
}];

@Injectable({
  providedIn: 'root',
})
export class DexieService extends Dexie {
  tasks: Dexie.Table<Task, string>;

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

    this.on('changes', (changes) => {
      console.log(changes);
    });
  }
}
