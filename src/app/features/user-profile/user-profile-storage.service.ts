import { Injectable } from '@angular/core';
import { IS_ELECTRON } from '../../app.constants';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import {
  DEFAULT_PROFILE_ID,
  DEFAULT_PROFILE_NAME,
  PROFILE_METADATA_FILENAME,
  ProfileMetadata,
  UserProfile,
} from './user-profile.model';
import { Log } from '../../core/log';
import { CompleteBackup } from '../../pfapi/api';
import { androidInterface } from '../android/android-interface';

/**
 * Service for managing profile storage
 * Handles platform-specific storage (Electron, Android, Web)
 */
@Injectable({
  providedIn: 'root',
})
export class UserProfileStorageService {
  /**
   * Load profile metadata from storage
   */
  async loadProfileMetadata(): Promise<ProfileMetadata | null> {
    try {
      if (IS_ELECTRON) {
        return await this._loadProfileMetadataElectron();
      } else if (IS_ANDROID_WEB_VIEW) {
        return await this._loadProfileMetadataAndroid();
      } else {
        return await this._loadProfileMetadataWeb();
      }
    } catch (error) {
      Log.err('UserProfileStorageService: Failed to load profile metadata', error);
      return null;
    }
  }

  /**
   * Save profile metadata to storage
   */
  async saveProfileMetadata(metadata: ProfileMetadata): Promise<void> {
    try {
      if (IS_ELECTRON) {
        await this._saveProfileMetadataElectron(metadata);
      } else if (IS_ANDROID_WEB_VIEW) {
        await this._saveProfileMetadataAndroid(metadata);
      } else {
        await this._saveProfileMetadataWeb(metadata);
      }
    } catch (error) {
      Log.err('UserProfileStorageService: Failed to save profile metadata', error);
      throw error;
    }
  }

  /**
   * Load profile data (complete backup) for a specific profile
   */
  async loadProfileData(profileId: string): Promise<CompleteBackup<any> | null> {
    try {
      if (IS_ELECTRON) {
        return await this._loadProfileDataElectron(profileId);
      } else if (IS_ANDROID_WEB_VIEW) {
        return await this._loadProfileDataAndroid(profileId);
      } else {
        return await this._loadProfileDataWeb(profileId);
      }
    } catch (error) {
      Log.err(
        `UserProfileStorageService: Failed to load profile data for ${profileId}`,
        error,
      );
      return null;
    }
  }

  /**
   * Save profile data (complete backup) for a specific profile
   */
  async saveProfileData(profileId: string, data: CompleteBackup<any>): Promise<void> {
    try {
      if (IS_ELECTRON) {
        await this._saveProfileDataElectron(profileId, data);
      } else if (IS_ANDROID_WEB_VIEW) {
        await this._saveProfileDataAndroid(profileId, data);
      } else {
        await this._saveProfileDataWeb(profileId, data);
      }
    } catch (error) {
      Log.err(
        `UserProfileStorageService: Failed to save profile data for ${profileId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete profile data from storage
   */
  async deleteProfileData(profileId: string): Promise<void> {
    try {
      if (IS_ELECTRON) {
        await this._deleteProfileDataElectron(profileId);
      } else if (IS_ANDROID_WEB_VIEW) {
        await this._deleteProfileDataAndroid(profileId);
      } else {
        await this._deleteProfileDataWeb(profileId);
      }
    } catch (error) {
      Log.err(
        `UserProfileStorageService: Failed to delete profile data for ${profileId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create initial profile metadata with default profile
   */
  createDefaultProfileMetadata(): ProfileMetadata {
    const defaultProfile: UserProfile = {
      id: DEFAULT_PROFILE_ID,
      name: DEFAULT_PROFILE_NAME,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    return {
      activeProfileId: DEFAULT_PROFILE_ID,
      profiles: [defaultProfile],
      version: 1,
    };
  }

  // ===== ELECTRON IMPLEMENTATIONS =====

  private async _loadProfileMetadataElectron(): Promise<ProfileMetadata | null> {
    const data = await window.ea.profileStorageLoad(PROFILE_METADATA_FILENAME);
    return data ? JSON.parse(data) : null;
  }

  private async _saveProfileMetadataElectron(metadata: ProfileMetadata): Promise<void> {
    await window.ea.profileStorageSave(
      PROFILE_METADATA_FILENAME,
      JSON.stringify(metadata),
    );
  }

  private async _loadProfileDataElectron(
    profileId: string,
  ): Promise<CompleteBackup<any> | null> {
    const filename = `${profileId}.json`;
    const data = await window.ea.profileStorageLoad(filename);
    return data ? JSON.parse(data) : null;
  }

  private async _saveProfileDataElectron(
    profileId: string,
    data: CompleteBackup<any>,
  ): Promise<void> {
    const filename = `${profileId}.json`;
    await window.ea.profileStorageSave(filename, JSON.stringify(data));
  }

  private async _deleteProfileDataElectron(profileId: string): Promise<void> {
    const filename = `${profileId}.json`;
    await window.ea.profileStorageDelete(filename);
  }

  // ===== ANDROID IMPLEMENTATIONS =====

  private async _loadProfileMetadataAndroid(): Promise<ProfileMetadata | null> {
    const key = `profile_meta_${PROFILE_METADATA_FILENAME}`;
    const data = await androidInterface.loadFromDbWrapped(key);
    return data ? JSON.parse(data as string) : null;
  }

  private async _saveProfileMetadataAndroid(metadata: ProfileMetadata): Promise<void> {
    const key = `profile_meta_${PROFILE_METADATA_FILENAME}`;
    await androidInterface.saveToDbWrapped(key, JSON.stringify(metadata));
  }

  private async _loadProfileDataAndroid(
    profileId: string,
  ): Promise<CompleteBackup<any> | null> {
    const key = `profile_data_${profileId}`;
    const data = await androidInterface.loadFromDbWrapped(key);
    return data ? JSON.parse(data as string) : null;
  }

  private async _saveProfileDataAndroid(
    profileId: string,
    data: CompleteBackup<any>,
  ): Promise<void> {
    const key = `profile_data_${profileId}`;
    await androidInterface.saveToDbWrapped(key, JSON.stringify(data));
  }

  private async _deleteProfileDataAndroid(profileId: string): Promise<void> {
    const key = `profile_data_${profileId}`;
    await androidInterface.removeFromDbWrapped(key);
  }

  // ===== WEB IMPLEMENTATIONS =====

  private async _loadProfileMetadataWeb(): Promise<ProfileMetadata | null> {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const key = `sp_profile_meta`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private async _saveProfileMetadataWeb(metadata: ProfileMetadata): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const key = `sp_profile_meta`;
    localStorage.setItem(key, JSON.stringify(metadata));
  }

  private async _loadProfileDataWeb(
    profileId: string,
  ): Promise<CompleteBackup<any> | null> {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const key = `sp_profile_data_${profileId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private async _saveProfileDataWeb(
    profileId: string,
    data: CompleteBackup<any>,
  ): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const key = `sp_profile_data_${profileId}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  private async _deleteProfileDataWeb(profileId: string): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const key = `sp_profile_data_${profileId}`;
    localStorage.removeItem(key);
  }
}
