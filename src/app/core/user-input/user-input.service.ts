import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserInputService {
  static _instance: UserInputService;

  private _pressedKeys: string[] = [];

  constructor() {
    window.addEventListener('keydown', (ev) => {
      this._pressedKeys.push(ev.key);
      console.log('keydown: ' + ev.key);
    });
    window.addEventListener('keydown', (ev) => {
      this._pressedKeys.slice(this._pressedKeys.indexOf(ev.key), 1);
      console.log('keyup: ' + ev.key);
    });
  }

  isKeyPressed(key: string) {
    return this._pressedKeys.indexOf(key) !== -1;
  }

}
