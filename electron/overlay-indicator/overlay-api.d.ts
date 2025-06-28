interface OverlayContentData {
  title: string;
  time: string;
  mode: 'pomodoro' | 'focus' | 'task' | 'idle';
}

interface OverlayAPI {
  setIgnoreMouseEvents: (ignore: boolean) => void;
  showMainWindow: () => void;
  onUpdateContent: (callback: (data: OverlayContentData) => void) => void;
}

declare global {
  interface Window {
    overlayAPI: OverlayAPI;
  }
}

export {};
