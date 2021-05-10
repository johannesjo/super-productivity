import { ConfigFormSection, TimelineConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const TIMELINE_FORM_CFG: ConfigFormSection<TimelineConfig> = {
  title: T.GCF.TIMELINE.TITLE,
  help: T.GCF.TIMELINE.HELP,
  key: 'timeline',
  items: [
    {
      key: 'isWorkStartEndEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TIMELINE.L_IS_WORK_START_END_ENABLED,
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWorkStartEndEnabled,
      key: 'workStart',
      type: 'input',
      templateOptions: {
        label: T.GCF.TIMELINE.L_WORK_START,
        description: T.GCF.TIMELINE.WORK_START_END_DESCRIPTION,
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWorkStartEndEnabled,
      key: 'workEnd',
      type: 'input',
      templateOptions: {
        label: T.GCF.TIMELINE.L_WORK_END,
        description: T.GCF.TIMELINE.WORK_START_END_DESCRIPTION,
      },
    },
  ],
};
