const PREFIX = 'pf_';
const MID_SEPERATOR = '_';
const END_SEPERATOR = '__';

// TODO unit test this a lot
export const pfGetSyncFilePrefix = (cfg: {
  isCompressed: boolean;
  isEncrypted: boolean;
  modelVersion: number;
}): string => {
  const c = cfg.isCompressed ? 'C' : '';
  const e = cfg.isEncrypted ? 'E' : '';

  return `${PREFIX}${c}${e}${MID_SEPERATOR}${cfg.modelVersion}${END_SEPERATOR}`;
};

export const pfExtractSyncFileStateFromPrefix = (
  dataStr: string,
): {
  isCompressed: boolean;
  isEncrypted: boolean;
  modelVersion: number;
  cleanDataStr: string;
} => {
  // TODO also account for numbers with . in them
  const match = dataStr.match(
    new RegExp(`^${PREFIX}(C)?(E)?${MID_SEPERATOR}(\\d+)${END_SEPERATOR}`),
  );
  if (!match) {
    throw new Error('pfExtractSyncFileStateFromPrefix: Invalid prefix');
  }

  return {
    isCompressed: !!match[1],
    isEncrypted: !!match[2],
    modelVersion: parseInt(match[3], 10),
    cleanDataStr: dataStr.slice(match[0].length),
  };
};
