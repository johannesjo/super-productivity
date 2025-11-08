import { app, ipcMain } from 'electron';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import * as path from 'path';
import { error, log } from 'electron-log/main';
import { IPC } from './shared-with-frontend/ipc-events.const';

const PROFILE_STORAGE_DIR = path.join(app.getPath('userData'), 'profiles');

/**
 * Initialize profile storage IPC handlers
 * Profiles are stored in: <userData>/profiles/
 */
export const initProfileStorageAdapter = (): void => {
  log('Profile storage directory:', PROFILE_STORAGE_DIR);

  // Ensure profile storage directory exists
  if (!existsSync(PROFILE_STORAGE_DIR)) {
    mkdirSync(PROFILE_STORAGE_DIR, { recursive: true });
    log('Created profile storage directory:', PROFILE_STORAGE_DIR);
  }

  // PROFILE_STORAGE_LOAD
  ipcMain.handle(
    IPC.PROFILE_STORAGE_LOAD,
    async (ev, filename: string): Promise<string | null> => {
      try {
        const filePath = path.join(PROFILE_STORAGE_DIR, filename);
        log('Loading profile file:', filePath);

        if (!existsSync(filePath)) {
          log('Profile file does not exist:', filePath);
          return null;
        }

        const data = readFileSync(filePath, { encoding: 'utf8' });
        return data;
      } catch (e) {
        error('Failed to load profile file:', filename, e);
        return null;
      }
    },
  );

  // PROFILE_STORAGE_SAVE
  ipcMain.handle(
    IPC.PROFILE_STORAGE_SAVE,
    async (ev, filename: string, data: string): Promise<void> => {
      try {
        const filePath = path.join(PROFILE_STORAGE_DIR, filename);
        log('Saving profile file:', filePath);

        writeFileSync(filePath, data, { encoding: 'utf8' });
        log('Profile file saved successfully:', filePath);
      } catch (e) {
        error('Failed to save profile file:', filename, e);
        throw e;
      }
    },
  );

  // PROFILE_STORAGE_DELETE
  ipcMain.handle(
    IPC.PROFILE_STORAGE_DELETE,
    async (ev, filename: string): Promise<void> => {
      try {
        const filePath = path.join(PROFILE_STORAGE_DIR, filename);
        log('Deleting profile file:', filePath);

        if (existsSync(filePath)) {
          unlinkSync(filePath);
          log('Profile file deleted successfully:', filePath);
        } else {
          log('Profile file does not exist, nothing to delete:', filePath);
        }
      } catch (e) {
        error('Failed to delete profile file:', filename, e);
        throw e;
      }
    },
  );
};
