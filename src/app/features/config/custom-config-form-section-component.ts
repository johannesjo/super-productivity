import { FileImexComponent } from '../../imex/file-imex/file-imex.component';
import { JiraCfgComponent } from '../issue/providers/jira/jira-view-components/jira-cfg/jira-cfg.component';
import { SimpleCounterCfgComponent } from '../simple-counter/simple-counter-cfg/simple-counter-cfg.component';
import { CustomCfgSection } from './global-config.model';

export const customConfigFormSectionComponent = (
  customSection: CustomCfgSection,
): unknown => {
  switch (customSection) {
    case 'FILE_IMPORT_EXPORT':
      return FileImexComponent;

    case 'JIRA_CFG':
      return JiraCfgComponent;

    case 'SIMPLE_COUNTER_CFG':
      return SimpleCounterCfgComponent;

    default:
      throw new Error('Invalid component');
  }
};
