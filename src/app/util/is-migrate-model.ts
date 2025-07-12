import { MODEL_VERSION_KEY } from '../app.constants';
import { Log } from '../core/log';

export const isMigrateModel = (
  modelData: any,
  localVersion: number,
  modelType: string = '?',
): boolean => {
  const importVersion = modelData && modelData[MODEL_VERSION_KEY];

  if (!modelData) {
    return false;
  } else if (importVersion === localVersion) {
    return false;
  } else if (importVersion > localVersion) {
    const isNewMajor = Math.floor(importVersion) - Math.floor(localVersion) >= 1;
    if (isNewMajor) {
      Log.log(modelType, { importVersion, localVersion, modelData });
      alert(
        // eslint-disable-next-line max-len
        `Cannot load model "${modelType}". Version to load (${importVersion}) is newer than the hard coded version (${localVersion}). Please close the app and update your local productivity version first, before importing the data.`,
      );
      throw new Error('Cannot load model. Version to load is newer than local');
    } else {
      Log.err(
        'Imported model newer than local version',
        'importVersion',
        importVersion,
        'localVersion',
        localVersion,
        'modelData',
        modelData,
      );
      return false;
    }
  } else {
    Log.log(
      `[M] Migrating model "${modelType}" to version from ${importVersion} to ${localVersion}`,
      modelData,
    );
    return true;
  }
};
