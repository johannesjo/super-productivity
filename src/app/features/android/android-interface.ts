import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import shortid from 'shortid';
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

  saveToDb?(key: string, value: string): void; // @deprecated

  saveToDbNew?(rId: string, key: string, value: string): void;

  saveToDbCallback?(rId: string): void;

  // load
  loadFromDbWrapped(key: string): Promise<string | null>;

  loadFromDb?(key: string): void; // @deprecated

  loadFromDbNew?(rId: string, key: string): void;

  loadFromDbCallback?(rId: string, data: string): void;

  // remove
  removeFromDbWrapped(key: string): Promise<void>;

  removeFromDb?(rId: string, key: string): void; // @deprecated

  removeFromDbCallback?(rId: string): void;

  // clear db
  clearDbWrapped(): Promise<void>;

  clearDb?(rId: string): void; // @deprecated

  clearDbCallback?(rId: string): void;

  // permanent notification
  updatePermanentNotification?(
    title: string,
    // because java sucks, we have to do this
    message: string, // '' => undefined
    progress: number, // -1 => undefined; 999 => indeterminate; 333 => show play but no progress bar
  ): void;

  // added here only
  onResume$: Subject<void>;
  onPause$: Subject<void>;
}

// setInterval(() => {
//   androidInterface.updatePermanentNotification?.(new Date().toString(), '', -1);
// }, 7000);

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;
export const IS_ANDROID_BACKUP_READY =
  IS_ANDROID_WEB_VIEW &&
  (typeof androidInterface?.saveToDb === 'function' ||
    typeof androidInterface?.saveToDbNew === 'function');

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

  if (androidInterface.saveToDbNew) {
    androidInterface.saveToDbCallback = (rId: string) => {
      requestMap[rId].resolve();
      delete requestMap[rId];
    };
  }
  androidInterface.saveToDbWrapped = (key: string, value: string): Promise<void> => {
    if (androidInterface.saveToDbNew) {
      const rId = shortid();
      androidInterface.saveToDbNew(rId, key, value);
      return getRequestMapPromise(rId);
      // legacy stuff, changed in newer versions of the android app
      // TODO remove if gone
    } else if (androidInterface.saveToDb) {
      androidInterface.saveToDb(key, value);
      return new Promise((resolve, reject) => {
        // NOTE currently there is no error handling
        (window as any).saveToDbCallback = () => {
          resolve();
        };
      });
    } else {
      throw new Error('No android save to db interface');
    }
  };

  if (androidInterface.loadFromDbNew) {
    androidInterface.loadFromDbCallback = (rId: string, k: string, result?: string) => {
      requestMap[rId].resolve(result || null);
      delete requestMap[rId];
    };
  }
  androidInterface.loadFromDbWrapped = (key: string): Promise<string | null> => {
    if (androidInterface.loadFromDbNew) {
      const rId = shortid();
      androidInterface.loadFromDbNew(rId, key);
      return getRequestMapPromise(rId);
      // legacy stuff, changed in newer versions of the android app
      // TODO remove if gone
    } else if (androidInterface.loadFromDb) {
      androidInterface.loadFromDb(key);
      return new Promise((resolve, reject) => {
        // NOTE currently there is no error handling
        (window as any).loadFromDbCallback = (k: string, result?: string) => {
          resolve(result || null);
        };
      });
    } else {
      throw new Error('No android loadFromDb interface');
    }
  };

  androidInterface.removeFromDbWrapped = (key: string): Promise<void> => {
    const rId = shortid();
    androidInterface.removeFromDb?.(rId, key);
    return getRequestMapPromise(rId);
  };
  androidInterface.removeFromDbCallback = (rId: string) => {
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  androidInterface.clearDbWrapped = (): Promise<void> => {
    const rId = shortid();
    androidInterface.clearDb?.(rId);
    return getRequestMapPromise(rId);
  };
  androidInterface.clearDbCallback = (rId: string) => {
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

  console.log('Android Web View interfaces initialized', androidInterface);
}
