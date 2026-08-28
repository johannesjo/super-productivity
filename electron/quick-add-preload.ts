import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { IS_GNOME_DESKTOP, IS_GNOME_WAYLAND, IS_WAYLAND } from './common.const';
import { getDistChannel } from './shared-with-frontend/get-dist-channel';
import type {
  AddTaskPayload,
  AddTaskSubmitResult,
} from '../src/app/features/tasks/add-task-bar/add-task-payload-builder';
import type { QuickAddSnapshotResult } from '../src/app/features/tasks/add-task-bar/quick-add-hud.model';
import type { QuickAddElectronApi, QuickAddElectronPlatformApi } from './electronAPI';

const quickAdd: QuickAddElectronApi = {
  closeQuickAdd: (): void => ipcRenderer.send(IPC.QUICK_ADD_CLOSE),
  submitQuickAddTask: (payload: AddTaskPayload): Promise<AddTaskSubmitResult> =>
    ipcRenderer.invoke(
      IPC.QUICK_ADD_TASK_SUBMIT_REQUEST,
      payload,
    ) as Promise<AddTaskSubmitResult>,
  requestQuickAddSnapshot: (): Promise<QuickAddSnapshotResult> =>
    ipcRenderer.invoke(IPC.QUICK_ADD_SNAPSHOT_REQUEST) as Promise<QuickAddSnapshotResult>,
  onQuickAddOpened: (listener: () => void): (() => void) => {
    const ipcListener = (): void => listener();
    ipcRenderer.on(IPC.QUICK_ADD_OPENED, ipcListener);
    return () => ipcRenderer.off(IPC.QUICK_ADD_OPENED, ipcListener);
  },
};

// The HUD renderer runs the same app modules as the main window, several of
// which read platform predicates off `window.ea` at import time. Those are
// answerable here (they only look at `process`), so they are implemented for
// real; everything else `ElectronAPI` offers belongs to a window that owns app
// state, which this one does not. `src/main.ts` wraps this in the proxy that
// handles the rest — see installQuickAddElectronApiShim() for why the wrapping
// cannot happen on this side of the bridge.
const quickAddEa: QuickAddElectronPlatformApi = {
  on: (): void => undefined,
  getDistChannel: () => getDistChannel(),
  isLinux: () => process.platform === 'linux',
  isMacOS: () => process.platform === 'darwin',
  isGnomeDesktop: () => IS_GNOME_DESKTOP,
  isGnomeWayland: () => IS_GNOME_WAYLAND,
  isWayland: () => IS_WAYLAND,
  isAppleSilicon: () => process.platform === 'darwin' && process.arch === 'arm64',
  isSnap: () => !!process.env?.SNAP,
  isFlatpak: () => !!process.env?.FLATPAK_ID,
};

contextBridge.exposeInMainWorld('quickAdd', quickAdd);
contextBridge.exposeInMainWorld('quickAddEa', quickAddEa);
