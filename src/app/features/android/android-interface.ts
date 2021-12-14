import { ANDROID_APP_VERSION, IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import shortid from 'shortid';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { Subject } from 'rxjs';

export interface AndroidInterface {
  showToast(s: string): void;

  showNotification(title: string, body: string): void;

  showNotificationIfAppIsNotOpen?(title: string, body: string): void;

  updateTaskData(s: string): void;

  triggerGetGoogleToken(): void;

  getGoogleToken(): Promise<string>;

  // save
  saveToDbWrapped(key: string, value: string): Promise<void>;

  saveToDb(key: string, value: string): void; // old

  saveToDb(rId: string, key: string, value: string): void;

  // load
  loadFromDbWrapped(key: string): Promise<string | null>;

  loadFromDb(key: string): void; // old

  loadFromDb(rId: string, key: string): void;

  // remove
  removeFromDbWrapped(key: string): Promise<void>;

  removeFromDb(key: string): void; // old

  removeFromDb(rId: string, key: string): void;

  // clear db
  clearDbWrapped(): Promise<void>;

  clearDb(): void; // old

  clearDb(rId: string): void;

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

  const requestMap: {
    [key: string]: {
      resolve: (returnVal?: any) => void;
      reject: (error?: any) => void;
    };
  } = {};

  const getRequestMapPromise = (rId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      requestMap[rId] = { resolve, reject };
    });
  };

  // NOTE currently there is no error handling
  androidInterface.saveToDbWrapped = (key: string, value: string): Promise<void> => {
    const rId = shortid();
    androidInterface.saveToDb(rId, key, value);
    return getRequestMapPromise(rId);
  };
  (window as any).saveToDbCallback = (rId: string) => {
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  androidInterface.loadFromDbWrapped = (key: string): Promise<string | null> => {
    const rId = shortid();
    androidInterface.loadFromDb(rId, key);
    return getRequestMapPromise(rId);
  };
  (window as any).loadFromDbCallback = (rId: string, k: string, result?: string) => {
    requestMap[rId].resolve(result || null);
    delete requestMap[rId];
  };

  androidInterface.removeFromDbWrapped = (key: string): Promise<void> => {
    const rId = shortid();
    androidInterface.removeFromDb(rId, key);
    return getRequestMapPromise(rId);
  };
  (window as any).removeFromDbCallback = (rId: string) => {
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  androidInterface.clearDbWrapped = (): Promise<void> => {
    const rId = shortid();
    androidInterface.clearDb(rId);
    return getRequestMapPromise(rId);
  };
  (window as any).clearDbCallback = (rId: string) => {
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  // TODO also adjust to use promise map
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
  }

  console.log('Android Web View interfaces initialized', androidInterface);
}
