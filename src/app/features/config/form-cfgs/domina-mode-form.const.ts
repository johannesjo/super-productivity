/* eslint-disable max-len */
import { ConfigFormSection, DominaModeConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const DOMINA_MODE_FORM: ConfigFormSection<DominaModeConfig> = {
  // title: T.F.SIMPLE_COUNTER.FORM.TITLE,
  title: 'DOMINA MODE',
  key: 'dominaMode',
  help: T.F.SIMPLE_COUNTER.FORM.HELP,
  items: [
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.IDLE.IS_ENABLE_IDLE_TIME_TRACKING,
      },
    },
    {
      key: 'interval',
      type: 'duration',
      hideExpression: '!model.isEnabled',
      templateOptions: {
        required: true,
        isAllowSeconds: true,
        // label: T.GCF.IDLE.MIN_IDLE_TIME,
        label: 'INTERVAL',
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'volume',
      type: 'input',
      hideExpression: '!model.isEnabled',
      templateOptions: {
        type: 'number',
        // label: T.GCF.IDLE.IS_ONLY_OPEN_IDLE_WHEN_CURRENT_TASK,
        label: 'Volume',
        description: 'E.g.: "Work on ${currentTaskTitle}"',
      },
    },
    {
      key: 'text',
      type: 'input',
      hideExpression: '!model.isEnabled',
      templateOptions: {
        label: T.GCF.IDLE.IS_ONLY_OPEN_IDLE_WHEN_CURRENT_TASK,
        description: 'E.g.: "Work on ${currentTaskTitle}!"',
      },
    },
  ],
};
