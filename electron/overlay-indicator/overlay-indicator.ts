import { BrowserWindow, ipcMain, screen, globalShortcut } from 'electron';
import { join } from 'path';
import { TaskCopy } from '../../src/app/features/tasks/task.model';
import { info } from 'electron-log/main';
import { IPC } from '../shared-with-frontend/ipc-events.const';

let overlayWindow: BrowserWindow | null = null;
let isOverlayEnabled = false;
let isOverlayVisible = true;
let currentTask: TaskCopy | null = null;
let isPomodoroEnabled = false;
let currentPomodoroSessionTime = 0;
let isFocusModeEnabled = false;
let currentFocusSessionTime = 0;

export const initOverlayIndicator = (enabled: boolean, shortcut?: string): void => {
  isOverlayEnabled = enabled;

  if (enabled) {
    createOverlayWindow();
    if (shortcut) {
      registerShortcut(shortcut);
    }
    initListeners();

    // Show overlay and request current task state
    setTimeout(() => {
      const mainWindow = BrowserWindow.getAllWindows().find(
        (win) => win !== overlayWindow,
      );
      if (mainWindow) {
        // Request current task state
        mainWindow.webContents.send(IPC.REQUEST_CURRENT_TASK_FOR_OVERLAY);
      }
      // Always show overlay when initialized
      showOverlayWindow();
    }, 100);
  }
};

export const updateOverlayEnabled = (isEnabled: boolean): void => {
  isOverlayEnabled = isEnabled;

  if (isEnabled && !overlayWindow) {
    createOverlayWindow();
    initListeners();

    // Show overlay and request current task state immediately when enabling
    setTimeout(() => {
      const mainWindow = BrowserWindow.getAllWindows().find(
        (win) => win !== overlayWindow,
      );
      if (mainWindow) {
        mainWindow.webContents.send(IPC.REQUEST_CURRENT_TASK_FOR_OVERLAY);
      }
      // Always show overlay when enabled
      showOverlayWindow();
    }, 100);
  } else if (!isEnabled && overlayWindow) {
    destroyOverlayWindow();
  }
};

export const updateOverlayTheme = (isDarkTheme: boolean): void => {
  // No longer needed - using prefers-color-scheme CSS
};

export const destroyOverlayWindow = (): void => {
  if (overlayWindow) {
    overlayWindow.removeAllListeners('close');
    overlayWindow.destroy();
    overlayWindow = null;
  }
};

const createOverlayWindow = (): void => {
  if (overlayWindow) {
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: 300,
    height: 80,
    x: width - 320,
    y: 20,
    title: 'Super Productivity Overlay',
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    // resizable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: false, // Disable shadow with transparent windows
    autoHideMenuBar: true,
    roundedCorners: false, // Disable rounded corners for better compatibility
    webPreferences: {
      preload: join(__dirname, 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      disableDialogs: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  overlayWindow.loadFile(join(__dirname, 'overlay.html'));

  // Set visible on all workspaces immediately after creation
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  overlayWindow.on('ready-to-show', () => {
    // Show the overlay window
    isOverlayVisible = true;
    overlayWindow.show();

    // Ensure window stays on all workspaces
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Request current task state from main window
    const mainWindow = BrowserWindow.getAllWindows().find((win) => win !== overlayWindow);
    if (mainWindow) {
      mainWindow.webContents.send(IPC.REQUEST_CURRENT_TASK_FOR_OVERLAY);
    }
  });

  // Prevent context menu on right-click to avoid crashes
  overlayWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Prevent any window system menu
  overlayWindow.on('system-context-menu', (e) => {
    e.preventDefault();
  });

  // Prevent window close attempts that might cause issues
  overlayWindow.on('close', (e) => {
    if (isOverlayEnabled) {
      e.preventDefault();
      overlayWindow.hide();
      isOverlayVisible = false;
    }
  });

  // Don't make window click-through initially to allow dragging
  // The renderer process will handle mouse events dynamically

  // Update initial state
  updateOverlayContent();
};

const registerShortcut = (shortcut: string): void => {
  globalShortcut.register(shortcut, () => {
    toggleOverlayVisibility();
  });
};

const toggleOverlayVisibility = (): void => {
  if (!overlayWindow) {
    return;
  }

  isOverlayVisible = !isOverlayVisible;
  if (isOverlayVisible) {
    overlayWindow.show();
  } else {
    overlayWindow.hide();
  }
};

export const showOverlayWindow = (): void => {
  if (!overlayWindow || !isOverlayEnabled) {
    info(
      'Overlay show skipped: window=' + !!overlayWindow + ', enabled=' + isOverlayEnabled,
    );
    return;
  }

  // Only show if not already visible
  if (!overlayWindow.isVisible()) {
    info('Showing overlay window');
    isOverlayVisible = true;
    overlayWindow.show();
  } else {
    info('Overlay already visible');
  }
};

export const hideOverlayWindow = (): void => {
  if (!overlayWindow || !isOverlayEnabled) {
    info(
      'Overlay hide skipped: window=' + !!overlayWindow + ', enabled=' + isOverlayEnabled,
    );
    return;
  }

  // Only hide if currently visible
  if (overlayWindow.isVisible()) {
    info('Hiding overlay window');
    isOverlayVisible = false;
    overlayWindow.hide();
  } else {
    info('Overlay already hidden');
  }
};

const initListeners = (): void => {
  // Listen for show main window request
  ipcMain.on('overlay-show-main-window', () => {
    const mainWindow = BrowserWindow.getAllWindows().find((win) => win !== overlayWindow);
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      hideOverlayWindow();
    }
  });
};

export const updateOverlayTask = (
  task: TaskCopy | null,
  pomodoroEnabled: boolean,
  pomodoroTime: number,
  focusModeEnabled: boolean,
  focusTime: number,
): void => {
  currentTask = task;
  isPomodoroEnabled = pomodoroEnabled;
  currentPomodoroSessionTime = pomodoroTime;
  isFocusModeEnabled = focusModeEnabled;
  currentFocusSessionTime = focusTime;

  updateOverlayContent();
};

const updateOverlayContent = (): void => {
  if (!overlayWindow || !isOverlayEnabled) {
    return;
  }

  let title = '';
  let timeStr = '';
  let mode: 'pomodoro' | 'focus' | 'task' | 'idle' = 'idle';

  if (currentTask && currentTask.title) {
    title = currentTask.title;
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }

    if (isPomodoroEnabled) {
      mode = 'pomodoro';
      timeStr = formatTime(currentPomodoroSessionTime);
    } else if (isFocusModeEnabled) {
      mode = 'focus';
      timeStr = formatTime(currentFocusSessionTime);
    } else if (currentTask.timeEstimate) {
      mode = 'task';
      const remainingTime = Math.max(currentTask.timeEstimate - currentTask.timeSpent, 0);
      timeStr = formatTime(remainingTime);
    } else if (currentTask.timeSpent) {
      mode = 'task';
      timeStr = formatTime(currentTask.timeSpent);
    }
  }

  overlayWindow.webContents.send('update-content', {
    title,
    time: timeStr,
    mode,
  });
};

const formatTime = (timeMs: number): string => {
  const totalSeconds = Math.floor(timeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
