export interface AndroidInterface {
  showToast(s: string): void;

  updateTaskData(s: string): void;

  triggerGetGoogleToken(): void;

  getGoogleToken(): Promise<string>;
}

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;

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
