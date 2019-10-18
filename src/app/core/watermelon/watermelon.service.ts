import {Injectable} from '@angular/core';
import {Database} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import schema from './schema';
import TaskMelon from './task';
// import Post from './model/Post' // ⬅️ You'll import your Models here

// First, create the adapter to the underlying database:
// const adapter = new SQLiteAdapter({
//   schema,
// })
const adapter = new LokiJSAdapter({
  schema,
});


@Injectable({
  providedIn: 'root'
})
export class WatermelonService {
  db;

  constructor() {

// Then, make a Watermelon database from it!
    this.db = new Database({
      adapter,
      modelClasses: [
        TaskMelon as any,
        // Post, // ⬅️ You'll add Models to Watermelon here
      ],
      actionsEnabled: true,
    });
  }
}
