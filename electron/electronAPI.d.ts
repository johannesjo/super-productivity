import { IpcRendererEvent, OpenExternalOptions } from 'electron';
import { Observable } from 'rxjs';
import {
  GlobalConfigState,
  TakeABreakConfig,
} from '../src/app/features/config/global-config.model';
import { KeyboardConfig } from '../src/app/features/config/keyboard-config.model';
import { JiraCfg } from '../src/app/features/issue/providers/jira/jira.model';
import { AppDataComplete } from '../src/app/imex/sync/sync.model';
import { Task } from '../src/app/features/tasks/task.model';

export interface ElectronAPI {
  // IPC STUFF
  ipcEvent$(evName: string): Observable<unknown>;

  invoke(channel: string, ...args: any[]): Promise<any>;

  off(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void;

  on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void;

  once(
    channel: string,
    listener: (event: IpcRendererEvent, ...args: any[]) => void,
  ): void;

  setZoomFactor(zoomFactor: number): void;

  getZoomFactor(): number;

  openPath(path: string): Promise<string>;

  openExternal(url: string, options?: OpenExternalOptions): Promise<void>;

  isMacOS(): boolean;

  // TODO implement
  reloadMainWin(): void;

  openDevTools(): void;

  relaunch(): void;

  exit(exitCode: number): void;

  shutdownNow(): void;

  flashFrame(): void;

  showOrFocus(): void;

  lockScreen(): void;

  informAboutAppReady(): void;

  isSystemDarkMode(): boolean;

  getUserDataPath(): Promise<string>;

  scheduleRegisterBeforeClose(id: string): void;

  unscheduleRegisterBeforeClose(id: string): void;

  setDoneRegisterBeforeClose(id: string): void;

  setProgressBar(args: { progress: number; progressBarMode: 'normal' | 'pause' }): void;

  sendAppSettingsToElectron(globalCfg: GlobalConfigState): void;

  registerGlobalShortcuts(keyboardConfig: KeyboardConfig): void;

  showFullScreenBlocker(args: { msg?: string; takeABreakCfg: TakeABreakConfig }): void;

  // TODO use invoke instead
  makeJiraRequest(args: {
    requestId: string;
    url: string;
    requestInit: RequestInit;
    jiraCfg: JiraCfg;
  }): void;

  jiraSetupImgHeaders(args: { jiraCfg: JiraCfg; wonkyCookie?: string }): void;

  backupAppData(appData: AppDataComplete): void;

  updateCurrentTask(task: Task | null);

  exec(command: string): void;
}
