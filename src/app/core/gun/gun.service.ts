import {Injectable} from '@angular/core';
import 'gun/lib/rindexed.js';
// import 'gun/lib/store.js';
import * as Gun from 'gun';
import {ReplaySubject} from 'rxjs';

console.log(Gun);

interface State {
  yourapp: {
    [Username: string]: { age: number }
  };
}
console.log(window['RindexedDB']);
const gun = new Gun({
  // tslint:disable-next-line
  store: window['RindexedDB']
});

@Injectable({
  providedIn: 'root'
})
export class GunService {
  private _t = {};
  public tasks$ = new ReplaySubject(1);

  get t() {
    return gun.get('tasks');
  }

  constructor() {
    console.log('XXX');

// super({
    //   store: RindexedDB({})
    // });
    // const user = gun.user();
    // user.auth('')

    // gun.get('mark').put({
    //   name: 'Mark',
    //   email: 'mark@gunDB.io',
    // });
    // gun.get('mark').on(function (data, key) {
    //   console.log("update mark:", data);
    // });

    this.t.on((data) => {
      console.log(data);
      // this.t.once((dataIn) => {
      //   console.log(dataIn);
      // });
      // this.tasks$.next();
    });
    // this.t.map().on((task, id) => {
    //   console.log(task, id);
    // });
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
    this.t.get(data.id).put(d);
    // arrayKeys.forEach(key => {
    //   this.t.get(data.id).get(key).set(data[key]);
    // });
  }

  getTasks$() {
  }
}
