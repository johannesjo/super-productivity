import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PomodoroService {
  cfg: Observable<any> = new BehaviorSubject({

  });
  isPause$: Observable<boolean>;
  isPlay$: Observable<boolean>;
  currentSessionTime$: Observable<number>;
  currentCycle$: Observable<number>;
  isOnLongBreak: Observable<boolean>;
  isOnShortBreak: Observable<boolean>;
  sessionProgress$: Observable<number>;

  constructor() {
  }

  skipBreak() {
  }

  sendUpdateToRemoteInterface() {
  }
}
