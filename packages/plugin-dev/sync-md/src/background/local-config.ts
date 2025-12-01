export interface LocalUserCfg {
  filePath: string;
  projectId: string;
}

// Storage key for local config
const LOCAL_STORAGE_KEY = 'sync-md-config';

export const loadLocalConfig = (): LocalUserCfg | null => {
  try {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      return JSON.parse(savedData) as LocalUserCfg;
    }
    return null;
  } catch (error) {
    console.error('[sync-md] Failed to load config:', error);
    return null;
  }
};

export const saveLocalConfig = (config: LocalUserCfg): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('[sync-md] Failed to save config:', error);
  }
};
