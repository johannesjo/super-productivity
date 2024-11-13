import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { nanoid } from 'nanoid';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import { mapTo } from 'rxjs/operators';

export interface AndroidInterface {
  getVersion?(): string;

  showToast(s: string): void;

  showNotification(title: string, body: string): void;

  showNotificationIfAppIsNotOpen?(title: string, body: string): void;

  updateTaskData(s: string): void;

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

  // WebDAV
  makeHttpRequestWrapped(
    url: string,
    method: string,
    data: string,
    username: string,
    password: string,
    readResponse: boolean,
  ): Promise<object>;

  makeHttpRequest?(
    rId: string,
    url: string,
    method: string,
    data: string,
    username: string,
    password: string,
    readResponse: boolean,
  ): void;

  makeHttpRequestCallback(rId: string, result: { [key: string]: any }): void;

  isGrantedFilePermission(): boolean;

  isGrantFilePermissionInProgress: boolean;
  allowedFolderPath(): string;
  grantFilePermissionWrapped(): Promise<object>;
  grantFilePermission(rId: string): void;
  grantFilePermissionCallBack(rId: string): void;

  getFileRev(filePath: string): string;
  readFile(filePath: string): string;
  writeFile(filePath: string, data: string): string;

  // added here only
  onResume$: Subject<void>;
  onPause$: Subject<void>;
  isInBackground$: Observable<boolean>;
  onPauseCurrentTask$: Subject<void>;
  onMarkCurrentTaskAsDone$: Subject<void>;
  onAddNewTask$: Subject<void>;
  isKeyboardShown$: Subject<boolean>;
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
  if (!androidInterface) {
    throw new Error('Cannot initialize androidInterface');
  }

  androidInterface.onResume$ = new Subject();
  androidInterface.onPause$ = new Subject();
  androidInterface.onPauseCurrentTask$ = new Subject();
  androidInterface.onMarkCurrentTaskAsDone$ = new Subject();
  androidInterface.onAddNewTask$ = new Subject();
  androidInterface.isKeyboardShown$ = new BehaviorSubject(false);

  androidInterface.isInBackground$ = merge(
    androidInterface.onResume$.pipe(mapTo(false)),
    androidInterface.onPause$.pipe(mapTo(true)),
  );

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
      const rId = nanoid();
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
      const rId = nanoid();
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
    const rId = nanoid();
    androidInterface.removeFromDb?.(rId, key);
    return getRequestMapPromise(rId);
  };
  androidInterface.removeFromDbCallback = (rId: string) => {
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  androidInterface.clearDbWrapped = (): Promise<void> => {
    const rId = nanoid();
    androidInterface.clearDb?.(rId);
    return getRequestMapPromise(rId);
  };
  androidInterface.clearDbCallback = (rId: string) => {
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  if (androidInterface.makeHttpRequest) {
    androidInterface.makeHttpRequestCallback = (rId: string, result: object) => {
      requestMap[rId].resolve(result);
      delete requestMap[rId];
    };
  }
  androidInterface.makeHttpRequestWrapped = (
    url: string,
    method: string,
    data: string,
    username: string,
    password: string,
    readResponse: boolean,
  ): Promise<object> => {
    if (androidInterface.makeHttpRequest) {
      const rId = nanoid();
      androidInterface.makeHttpRequest(
        rId,
        url,
        method,
        data,
        username,
        password,
        readResponse,
      );
      return getRequestMapPromise(rId);
    } else {
      throw new Error('No android makeHttpRequest interface');
    }
  };

  androidInterface.isGrantFilePermissionInProgress = false;

  androidInterface.grantFilePermissionWrapped = (): Promise<object> => {
    androidInterface.isGrantFilePermissionInProgress = true;
    const rId = nanoid();
    androidInterface.grantFilePermission(rId);
    return getRequestMapPromise(rId);
  };

  androidInterface.grantFilePermissionCallBack = (rId: string) => {
    androidInterface.isGrantFilePermissionInProgress = false;
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  console.log('Android Web View interfaces initialized', androidInterface);
}
