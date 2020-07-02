import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';

export interface AndroidInterface {
  showToast(s: string): void;

  showNotification(title: string, body: string): void;

  updateTaskData(s: string): void;

  triggerGetGoogleToken(): void;

  getGoogleToken(): Promise<string>;
}

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;

if (IS_ANDROID_WEB_VIEW) {
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
