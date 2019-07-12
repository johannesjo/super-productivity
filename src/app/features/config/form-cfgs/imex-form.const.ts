// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';

export const IMEX_FORM: ConfigFormSection =   {
  title: 'Import/Export',
  key: 'EMPTY',
  /* tslint:disable */
  help: `  <p>Here you can export all your data as a
    <strong>JSON</strong> for backups, but also to use it in a different context (e.g. you might want to export your projects in the browser and import them into the desktop version).
  </p>
  <p>The import expects valid JSON to be copied into the text area.
    <strong>NOTE: Once you hit the import button all your current settings and data will be overwritten!</strong></p>
`,
  /* tslint:enable */
  customSection: 'FILE_IMPORT_EXPORT',
};
