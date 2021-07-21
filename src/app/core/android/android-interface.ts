import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';

export interface AndroidInterface {
  showToast(s: string): void;

  showNotification(title: string, body: string): void;

  updateTaskData(s: string): void;

  triggerGetGoogleToken(): void;

  getGoogleToken(): Promise<string>;

  saveToDb(key: string, value: string): void;

  saveToDbWrapped(key: string, value: string): Promise<void>;

  loadFromDb(key: string): void;

  loadFromDbWrapped(key: string): Promise<string | null>;
}

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;
export const IS_ANDROID_BACKUP_READY =
  IS_ANDROID_WEB_VIEW && typeof androidInterface?.saveToDb === 'function';

if (IS_ANDROID_WEB_VIEW) {
  console.log(androidInterface);

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
