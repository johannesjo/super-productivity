import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { Subject } from 'rxjs';

export interface AndroidInterface {
  showToast(s: string): void;

  showNotification(title: string, body: string): void;

  showNotificationIfAppIsNotOpen?(title: string, body: string): void;

  updateTaskData(s: string): void;

  triggerGetGoogleToken(): void;

  getGoogleToken(): Promise<string>;

  saveToDb(key: string, value: string): void;

  saveToDbWrapped(key: string, value: string): Promise<void>;

  loadFromDb(key: string): void;

  loadFromDbWrapped(key: string): Promise<string | null>;

  // TODO not implemented for android yet
  removeFromDb(key: string): void;

  removeFromDbWrapped(key: string): Promise<void>;

  clearDb(): void;

  clearDbWrapped(): Promise<void>;


  // permanent notification
  updatePermanentNotification?(
    title: string,
    // because java sucks, we have to do this
    message: string, // '' => undefined
    progress: number, // -1 => undefined; 999 => indeterminate
    notify: boolean,
  ): void;

  // added here only
  onResume$: Subject<void>;
  onPause$: Subject<void>;
}

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;
export const IS_ANDROID_BACKUP_READY =
  IS_ANDROID_WEB_VIEW && typeof androidInterface?.saveToDb === 'function';

if (IS_ANDROID_WEB_VIEW) {
  androidInterface.onResume$ = new Subject();
  androidInterface.onPause$ = new Subject();

  androidInterface.saveToDbWrapped = (key: string, value: string): Promise<void> => {
    androidInterface.saveToDb(key, value);
    return new Promise((resolve, reject) => {
      // NOTE currently there is no error handling
      (window as any).saveToDbCallback = () => {
        resolve();
      };
    });
  };

  androidInterface.loadFromDbWrapped = (key: string): Promise<string | null> => {
    androidInterface.loadFromDb(key);
    return new Promise((resolve, reject) => {
      // NOTE currently there is no error handling
      (window as any).loadFromDbCallback = (k: string, result?: string) => {
        resolve(result || null);
      };
    });
  };

  androidInterface.removeFromDbWrapped = (key: string): Promise<void> => {
    androidInterface.removeFromDb(key);
    return new Promise((resolve, reject) => {
      // NOTE currently there is no error handling
      (window as any).removeFromDbCallback = () => {
        resolve();
      };
    });
  };

  androidInterface.clearDbWrapped = (): Promise<void> => {
    androidInterface.clearDb();
    return new Promise((resolve, reject) => {
      // NOTE currently there is no error handling
      (window as any).clearDbCallback = () => {
        resolve();
      };
    });
  };

  androidInterface.getGoogleToken = () => {
    androidInterface.triggerGetGoogleToken();

    // TODO add map similar to jira api
    return new Promise<string>((resolve, reject) => {
      (window as any).googleGetTokenSuccessCallback = (token: string) => {
        resolve(token);
      };
      (window as any).googleGetTokenErrorCallback = (token: string) => {
        reject(token);
      };
    });
  };

  console.log('Android Web View interfaces initialized', androidInterface);
}
