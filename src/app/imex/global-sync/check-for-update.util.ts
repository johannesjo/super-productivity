export enum UpdateCheckResult {
  InSync = 'InSync',
  LocalUpdateRequired = 'LocalUpdateRequired',
  RemoteUpdateRequired = 'RemoteUpdateRequired',
  DataDiverged = 'DataDiverged',
  RemoteNotUpToDateDespiteSync = 'RemoteNotUpToDateDespiteSync',
  LastSyncNotUpToDate = 'LastSyncNotUpToDate',
}

export const checkForUpdate = (params: { remote: number, local: number, lastSync: number }) => {
  _logHelper(params);
  const {remote, local, lastSync} = params;

  if (lastSync > local) {
    throw new Error('This should not happen. lastSyncTo > local');
  }

  if (local === remote) {
    if (local === lastSync) {
      return UpdateCheckResult.InSync;
    } else {
      return UpdateCheckResult.LastSyncNotUpToDate;
    }
  } else if (local > remote) {
    if (lastSync < remote) {
      console.log('DATA DIVERGED: local > remote');
      return UpdateCheckResult.DataDiverged;
    } else if (lastSync < local) {
      return UpdateCheckResult.RemoteUpdateRequired;
    } else if (lastSync === local) {
      alert('Remote not up to date despite previous sync');
      return UpdateCheckResult.RemoteNotUpToDateDespiteSync;
    }
  } else if (local < remote) {
    if (lastSync !== local) {
      console.log('DATA DIVERGED: local < remote');
      return UpdateCheckResult.DataDiverged;
    } else {
      return UpdateCheckResult.LocalUpdateRequired;
    }
  }

  throw new Error('Inconclusive state. This should not happen');
};


const _logHelper = (params: { remote: number, local: number, lastSync: number }) => {
  console.log(params);
  const lowestFirst = Object.keys(params).sort((k1, k2) => params[k1] - params[k2]);
  const lowestKey = lowestFirst[0];
  const zeroed = lowestFirst.reduce((acc, key) =>
      ({
        ...acc,
        [key]: (params[key] - params[lowestKey]) / 1000,
      }),
    {});
  console.log(zeroed, (Date.now() - params[lowestKey]) / 1000);
};
