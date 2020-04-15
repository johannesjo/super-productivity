export interface AndroidInterface {
  showToast(s: string): void;
}

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;
