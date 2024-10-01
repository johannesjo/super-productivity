import { IpcRendererEvent } from 'electron';
import {
  GlobalConfigState,
  TakeABreakConfig,
} from '../src/app/features/config/global-config.model';
import { KeyboardConfig } from '../src/app/features/config/keyboard-config.model';
import { JiraCfg } from '../src/app/features/issue/providers/jira/jira.model';
import { AppDataComplete, SyncGetRevResult } from '../src/app/imex/sync/sync.model';
import { Task } from '../src/app/features/tasks/task.model';
import { LocalBackupMeta } from '../src/app/imex/local-backup/local-backup.model';

export interface ElectronAPI {
  on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void;

  // INVOKE
  // ------
  getUserDataPath(): Promise<string>;

  getBackupPath(): Promise<string>;

  checkBackupAvailable(): Promise<false | LocalBackupMeta>;

  loadBackupData(backupPath: string): Promise<string>;

  fileSyncGetRevAndClientUpdate(args: {
    filePath: string;
    localRev: string | null;
  }): Promise<{ rev: string; clientUpdate?: number } | SyncGetRevResult>;

  fileSyncSave(args: {
    filePath: string;
    localRev: string | null;
    dataStr: string;
  }): Promise<string | Error>;

  fileSyncLoad(args: {
    filePath: string;
    localRev: string | null;
  }): Promise<{ rev: string; dataStr: string | undefined } | Error>;

  checkDirExists(args: { dirPath: string }): Promise<true | Error>;

  pickDirectory(): Promise<string | undefined>;

  // checkDirExists(dirPath: string): Promise<true | Error>;

  // STANDARD
  // --------
  setZoomFactor(zoomFactor: number): void;

  getZoomFactor(): number;

  openPath(path: string): void;

  openExternalUrl(url: string): void;

  isMacOS(): boolean;

  isSnap(): boolean;

  // SEND
  // ----
  reloadMainWin(): void;

  openDevTools(): void;

  relaunch(): void;

  exit(exitCode: number): void;

  shutdownNow(): void;

  flashFrame(): void;

  showOrFocus(): void;

  lockScreen(): void;

  informAboutAppReady(): void;

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
