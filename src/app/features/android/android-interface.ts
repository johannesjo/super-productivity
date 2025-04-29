import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { nanoid } from 'nanoid';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import { mapTo } from 'rxjs/operators';

export interface AndroidInterface {
  getVersion?(): string;

  showToast(s: string): void;

  // save
  saveToDbWrapped(key: string, value: string): Promise<void>;

  saveToDb(rId: string, key: string, value: string): void;

  saveToDbCallback(rId: string): void;

  // load
  loadFromDbWrapped(key: string): Promise<string | null>;

  loadFromDb(rId: string, key: string): void;

  loadFromDbCallback(rId: string, data: string): void;

  // remove
  removeFromDbWrapped(key: string): Promise<void>;

  removeFromDb(rId: string, key: string): void;

  removeFromDbCallback(rId: string): void;

  // clear db
  clearDbWrapped(): Promise<void>;

  clearDb(rId: string): void; // @deprecated
  clearDbCallback(rId: string): void;

  // added here only
  onResume$: Subject<void>;
  onPause$: Subject<void>;
  isInBackground$: Observable<boolean>;
  isKeyboardShown$: Subject<boolean>;

  // onPauseCurrentTask$: Subject<void>;
  // onMarkCurrentTaskAsDone$: Subject<void>;
  // onAddNewTask$: Subject<void>;
}

// setInterval(() => {
//   androidInterface.updatePermanentNotification?.(new Date().toString(), '', -1);
// }, 7000);

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;

if (IS_ANDROID_WEB_VIEW) {
  if (!androidInterface) {
    throw new Error('Cannot initialize androidInterface');
  }

  androidInterface.onResume$ = new Subject();
  androidInterface.onPause$ = new Subject();
  // androidInterface.onPauseCurrentTask$ = new Subject();
  // androidInterface.onMarkCurrentTaskAsDone$ = new Subject();
  // androidInterface.onAddNewTask$ = new Subject();
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

  androidInterface.saveToDbCallback = (rId: string) => {
    requestMap[rId].resolve();
    delete requestMap[rId];
  };

  androidInterface.saveToDbWrapped = (key: string, value: string): Promise<void> => {
    const rId = nanoid();
    androidInterface.saveToDb(rId, key, value);
    return getRequestMapPromise(rId);
  };

  androidInterface.loadFromDbCallback = (rId: string, k: string, result?: string) => {
    requestMap[rId].resolve(result || null);
    delete requestMap[rId];
  };
  androidInterface.loadFromDbWrapped = (key: string): Promise<string | null> => {
    const rId = nanoid();
    androidInterface.loadFromDb(rId, key);
    return getRequestMapPromise(rId);
  };

  androidInterface.removeFromDbWrapped = (key: string): Promise<void> => {
    const rId = nanoid();
    androidInterface.removeFromDb(rId, key);
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

  console.log('Android Web View interfaces initialized', androidInterface);
}
