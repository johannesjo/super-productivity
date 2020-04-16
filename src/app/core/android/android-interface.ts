export interface AndroidInterface {
  showToast(s: string): void;
  updateTaskData(s: string): void;
}

export const androidInterface: AndroidInterface = (window as any).SUPAndroid;
