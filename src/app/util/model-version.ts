import {MODEL_VERSION_KEY} from '../app.constants';

export const isMigrateModel = (modelData: any, localModelVersion: number): boolean => {
  if (!modelData) {
    return false;
  } else if (modelData && modelData[MODEL_VERSION_KEY] === localModelVersion) {
  } else if (modelData && modelData[MODEL_VERSION_KEY] > localModelVersion) {
    alert('Cannot load model. Version to load is newer than local. Please close the app and update your local productivity version first, before importing the data.');
    throw new Error('Cannot load model. Version to load is newer than local');
  } else {
    console.log(`Migrating model to version from ${modelData[MODEL_VERSION_KEY]} to ${localModelVersion}`, modelData);
    return true;
  }
};
