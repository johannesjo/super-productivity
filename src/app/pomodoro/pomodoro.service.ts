import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConfigService } from '../core/config/config.service';
import { map } from 'rxjs/operators';
import { PomodoroConfig } from '../core/config/config.model';
import { DEFAULT_CFG } from '../core/config/default-config.const';

@Injectable({
  providedIn: 'root'
})
export class PomodoroService {
  cfg$: Observable<PomodoroConfig> = this._configService.cfg$.pipe(map(cfg => cfg && cfg.pomodoro));
  isPause$: Observable<boolean>;
  isPlay$: Observable<boolean>;
  currentSessionTime$: Observable<number> = new BehaviorSubject(DEFAULT_CFG.pomodoro.duration);
  currentCycle$: Observable<number>;
  isOnLongBreak: Observable<boolean>;
  isOnShortBreak: Observable<boolean>;
  sessionProgress$: Observable<number>;

  constructor(private _configService: ConfigService) {
  }

  skipBreak() {
  }

  sendUpdateToRemoteInterface() {
  }
}
