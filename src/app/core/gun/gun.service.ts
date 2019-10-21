import {Injectable} from '@angular/core';
// import 'gun/lib/store.js';
import * as Gun from 'gun';
import 'gun/lib/rindexed.js';
import 'gun/lib/open.js';
import {BehaviorSubject, Observable, ReplaySubject} from 'rxjs';

// console.log(Gun);
// console.log(window['RindexedDB']);

interface State {
  yourapp: {
    [Username: string]: { age: number }
  };
}

const gun = new Gun({
  // tslint:disable-next-line
  store: window['RindexedDB']
});

@Injectable({
  providedIn: 'root'
})
export class GunService {
  private _t = {};
  public tasks$: BehaviorSubject<any[]> = new BehaviorSubject([]);

  get t() {
    return gun.get('tasks');
  }

  constructor() {
    console.log('XXX');

    this.t.open((data) => {
      console.log(data);
      console.log(Object.keys(data));
      const array = Object.keys(data).map(key => data[key]);
      console.log(array);
      this.tasks$.next(array.reverse());
    });
    this.t.map().on((task, id) => {
      console.log(task, id);
    });
    this.t.once(v => console.log(v));

  }

  addTask(data) {
    const keys = Object.keys(data);
    const nonArrayKeys: string[] = keys.filter((key) => !Array.isArray(data[key]));
    const arrayKeys: string[] = keys.filter((key) => Array.isArray(data[key]));
    const d = nonArrayKeys.reduce((acc, key) => ({
      ...acc,
      [key]: data[key]
    }), {});
    const task = this.t.set(data.id).put(d);
    // arrayKeys.forEach(key => {
    //   task.get(key).set(data[key]);
    // });
  }

  getTasks$() {
  }
}
