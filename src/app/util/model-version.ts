import { MODEL_VERSION_KEY } from '../app.constants';

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
      console.log(modelType, { importVersion, localVersion, modelData });
      alert(
        // eslint-disable-next-line max-len
        `Cannot load model "${modelType}". Version to load (${importVersion}) is newer than the hard coded version (${localVersion}). Please close the app and update your local productivity version first, before importing the data.`,
      );
      throw new Error('Cannot load model. Version to load is newer than local');
    } else {
      console.warn(
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
    console.log(
      `[M] Migrating model "${modelType}" to version from ${importVersion} to ${localVersion}`,
      modelData,
    );
    return true;
  }
};
