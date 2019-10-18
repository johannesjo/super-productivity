import {Injectable} from '@angular/core';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import schema from './schema';
import TaskMelon from './task';
import {switchMap} from 'rxjs/operators';
import {from, merge, Observable} from 'rxjs';

// First, create the adapter to the underlying database:
// const adapter = new SQLiteAdapter({
//   schema,
// })
const adapter = new LokiJSAdapter({
  schema,
});

const modelClasses = [
  TaskMelon as any,
];


@Injectable({
  providedIn: 'root'
})
export class WatermelonService {
  db = new Database({
    adapter,
    modelClasses,
    actionsEnabled: true,
  });

  task = this._createCollection(TaskMelon.table);

  constructor() {
  }


  private _createCollection(tableName: string) {
    const col = this.db.collections.get(tableName);
    console.log(col);
    return {
      query: () => col.query().fetch(),
      query$: (): Observable<any> => merge(
        from(col.query().fetch()),
        col.changes.pipe(
          switchMap(() => col.query().fetch())
        )
      ),
      add: (item) => {
        this.db.action(async () => {
          await col.create(itemInner => {
            Object.keys(item).forEach((key) => {
              if (key !== 'id') {
                // NOTE: don't know who designed this, but this is how it works
                itemInner[key] = item[key];
              }
            });
          });
        });
      }
    };


  }
}
