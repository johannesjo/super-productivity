import {Injectable} from '@angular/core';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import schema from './schema';
import TaskMelon from './task';
import {Observable} from 'rxjs';

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
    const collection = this.db.collections.get(tableName);
    console.log(collection);
    return {
      query: () => collection.query().fetch(),
      query$: (): Observable<any> => collection.query().observe(),
      add: (item): Promise<any> => this.db.action(async () => {
        await collection.create(itemInner => {
          Object.keys(item).forEach((key) => {
            if (key !== 'id') {
              // NOTE: don't know who designed this, but this is how it works
              itemInner[key] = item[key];
            }
          });
        });
      }),
      update: (itemId: string, changes: any): Promise<any> => this.db.action(async () => {
        const item = await collection.find(itemId);
        await item.update(changes);
      }),
      remove: (itemId: string): Promise<any> => this.db.action(async () => {
        console.time('delete');
        const item = await collection.find(itemId);
        // await item.destroyPermanently();
        await item.markAsDeleted();

        console.timeEnd('delete');
      }),
      collection,
    };
  }
}
