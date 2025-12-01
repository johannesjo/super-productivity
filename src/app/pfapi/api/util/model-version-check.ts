import { ImpossibleError } from '../errors/errors';

export enum ModelVersionCheckResult {
  MajorUpdate = 'MajorUpdate',
  MinorUpdate = 'MinorUpdate',
  RemoteMajorAhead = 'RemoteMajorAhead',
  RemoteModelEqualOrMinorUpdateOnly = 'RemoteModelEqualOrMinorUpdateOnly',
}

export const modelVersionCheck = ({
  clientVersion,
  toImport,
}: {
  clientVersion: number;
  toImport: number;
}): ModelVersionCheckResult => {
  const majorDiff = Math.floor(clientVersion) - Math.floor(toImport);
  const isMajorChange = Math.abs(majorDiff) >= 1;

  if (clientVersion === toImport) {
    return ModelVersionCheckResult.RemoteModelEqualOrMinorUpdateOnly;
  }
  if (clientVersion > toImport) {
    if (isMajorChange) {
      return ModelVersionCheckResult.MajorUpdate;
    }
    return ModelVersionCheckResult.MinorUpdate;
  }
  if (clientVersion < toImport) {
    if (isMajorChange) {
      // throw new ModelVersionToImportNewerThanLocalError({ clientVersion, toImport });
      return ModelVersionCheckResult.RemoteMajorAhead;
    }
    return ModelVersionCheckResult.RemoteModelEqualOrMinorUpdateOnly;
  }

  throw new ImpossibleError();
};
