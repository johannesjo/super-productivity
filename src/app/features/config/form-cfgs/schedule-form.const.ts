import { ConfigFormSection, ScheduleConfig } from '../global-config.model';
import { T } from '../../../t.const';
import { isValidSplitTime } from '../../../util/is-valid-split-time';

export const SCHEDULE_FORM_CFG: ConfigFormSection<ScheduleConfig> = {
  title: T.GCF.SCHEDULE.TITLE,
  help: T.GCF.SCHEDULE.HELP,
  key: 'schedule',
  items: [
    {
      key: 'isWorkStartEndEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.SCHEDULE.L_IS_WORK_START_END_ENABLED,
      },
    },
    {
      key: 'isWeekendHoursEnabled',
      type: 'checkbox',
      templateOptions: {
        label: '启用周末（周六/周日）独立工作时间',
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWeekendHoursEnabled,
      key: 'weekendWorkStart',
      type: 'input',
      templateOptions: {
        required: true,
        label: '周末开始时间',
        description: T.GCF.SCHEDULE.WORK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWeekendHoursEnabled,
      key: 'weekendWorkEnd',
      type: 'input',
      templateOptions: {
        required: true,
        label: '周末结束时间',
        description: T.GCF.SCHEDULE.WORK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWorkStartEndEnabled,
      key: 'workStart',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.GCF.SCHEDULE.L_WORK_START,
        description: T.GCF.SCHEDULE.WORK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWorkStartEndEnabled,
      key: 'workEnd',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.GCF.SCHEDULE.L_WORK_END,
        description: T.GCF.SCHEDULE.WORK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    {
      key: 'isLunchBreakEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.SCHEDULE.L_IS_LUNCH_BREAK_ENABLED,
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isLunchBreakEnabled,
      key: 'lunchBreakStart',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.GCF.SCHEDULE.L_LUNCH_BREAK_START,
        description: T.GCF.SCHEDULE.LUNCH_BREAK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isLunchBreakEnabled,
      key: 'lunchBreakEnd',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.GCF.SCHEDULE.L_LUNCH_BREAK_END,
        description: T.GCF.SCHEDULE.LUNCH_BREAK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    // Custom Block A
    {
      key: 'customBlockAStart',
      type: 'input',
      templateOptions: {
        label: 'Custom Block A Start (HH:mm)',
        description: '可选。此时间段内不进行自动排程',
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return !c.value || isValidSplitTime(c.value);
        },
      },
    },
    {
      key: 'customBlockAEnd',
      type: 'input',
      templateOptions: {
        label: 'Custom Block A End (HH:mm)',
        description: '可选。与上方配合使用',
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return !c.value || isValidSplitTime(c.value);
        },
      },
    },
    // Custom Block B
    {
      key: 'customBlockBStart',
      type: 'input',
      templateOptions: {
        label: 'Custom Block B Start (HH:mm)',
        description: '可选。此时间段内不进行自动排程',
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return !c.value || isValidSplitTime(c.value);
        },
      },
    },
    {
      key: 'customBlockBEnd',
      type: 'input',
      templateOptions: {
        label: 'Custom Block B End (HH:mm)',
        description: '可选。与上方配合使用',
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return !c.value || isValidSplitTime(c.value);
        },
      },
    },
    // Multiple custom blocks by text (weekday/weekend)
    {
      key: 'customBlocksWeekdayStr',
      type: 'input',
      templateOptions: {
        label: '工作日自定义不可排程（多段）',
        description: '格式: HH:mm-HH:mm; HH:mm-HH:mm，如 07:00-12:05; 12:40-16:30',
      },
    },
    {
      key: 'customBlocksWeekendStr',
      type: 'input',
      templateOptions: {
        label: '周末自定义不可排程（多段）',
        description: '格式: HH:mm-HH:mm; HH:mm-HH:mm',
      },
    },
    // Sorting option
    {
      key: 'isAutoSortByEstimateDesc',
      type: 'checkbox',
      templateOptions: {
        label: '自动按预估时长降序排序（平衡每日难度）',
      },
    },
  ],
};
