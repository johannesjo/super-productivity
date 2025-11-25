/**
 * User Profile Model
 * Each profile represents a complete, isolated instance of the application
 * with its own settings, tasks, projects, and sync configuration
 */

export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  lastUsedAt: number;
  // Optional icon or color for visual distinction
  color?: string;
  icon?: string;
}

export interface ProfileMetadata {
  activeProfileId: string;
  profiles: UserProfile[];
  version: number; // For future migrations
}

export const DEFAULT_PROFILE_ID = 'default';
export const DEFAULT_PROFILE_NAME = 'Default Profile';

export const PROFILE_METADATA_FILENAME = 'profiles-meta.json';
export const PROFILE_DATA_FOLDER = 'profiles';
