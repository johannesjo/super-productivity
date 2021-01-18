/* eslint-disable max-len */
import { ConfigFormSection } from '../global-config.model';
import { T } from '../../../t.const';

export const IMEX_FORM: ConfigFormSection<{ [key: string]: any }> = {
  title: T.GCF.IMEX.TITLE,
  key: 'EMPTY',
  help: T.GCF.IMEX.HELP,
  customSection: 'FILE_IMPORT_EXPORT',
};
