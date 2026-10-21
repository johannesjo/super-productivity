import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../../t.const';
import { RepeatQuickSetting, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getQuickSettingUpdates } from './get-quick-setting-updates';
import { getDbDateStr } from '../../../util/get-db-date-str';
import {
  AFTER_COMPLETION_PRESET,
  isCustomOrAfterCompletionPreset,
} from './after-completion-form-mapping';

const updateParent = (
  field: FormlyFieldConfig,
  changes: Partial<TaskRepeatCfg>,
): void => {
  // possibly better?
  field.form?.patchValue({
    // ...field.parent.model,
    ...changes,
  } as any);
};

export const TASK_REPEAT_CFG_ESSENTIAL_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'title',
    type: 'input',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.TITLE,
    },
  },

  {
    key: 'quickSetting',
    type: 'icon-select',
    defaultValue: 'DAILY',
    templateOptions: {
      required: true,
      label: T.F.TASK_REPEAT.F.QUICK_SETTING,
      // NOTE replaced in component to allow for dynamic translation
      options: [],
      change: (field, event) => {
        const updatesForQuickSetting = getQuickSettingUpdates(
          event.value as RepeatQuickSetting,
        );
        if (updatesForQuickSetting) {
          // NOTE: for some reason this doesn't update the model value, just the view value :(
          updateParent(field, updatesForQuickSetting);
        }
      },
    },
  },

  // REPEAT CUSTOM CFG - Wrapped in container
  {
    fieldGroupClassName: 'repeat-config-container',
    resetOnHide: false,
    hideExpression: (model: any) => !isCustomOrAfterCompletionPreset(model.quickSetting),
    // Fixed schedule or after completion is picked with the preset alone (#5388).
    fieldGroup: [
      {
        fieldGroupClassName: 'repeat-cycle',
        fieldGroup: [
          {
            key: 'repeatEvery',
            type: 'input',
            defaultValue: 1,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.REPEAT_EVERY,
              required: true,
              min: 1,
              max: 1000,
              type: 'number',
            },
          },
          {
            key: 'repeatCycle',
            type: 'select',
            defaultValue: 'WEEKLY',
            templateOptions: {
              required: true,
              label: T.F.TASK_REPEAT.F.REPEAT_CYCLE,
              options: [
                { value: 'DAILY', label: T.F.TASK_REPEAT.F.C_DAY },
                { value: 'WEEKLY', label: T.F.TASK_REPEAT.F.C_WEEK },
                { value: 'MONTHLY', label: T.F.TASK_REPEAT.F.C_MONTH },
                { value: 'YEARLY', label: T.F.TASK_REPEAT.F.C_YEAR },
              ],
            },
          },
        ],
      },
      {
        fieldGroupClassName: 'monthly-anchor',
        resetOnHide: false,
        // After completion is a plain interval from the completion day.
        hideExpression: (model: any) =>
          model.repeatCycle !== 'MONTHLY' ||
          model.quickSetting === AFTER_COMPLETION_PRESET,
        fieldGroup: [
          {
            key: 'monthlyWeekOfMonth',
            type: 'select',
            // Picking the "Day of month" sentinel clears the anchor; the
            // gatekeeper falls back to legacy day-of-month behavior.
            defaultValue: null,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.WEEK_OF_MONTH,
              description: T.F.TASK_REPEAT.F.MONTHLY_MODE_DAY_OF_MONTH_DESCRIPTION,
              options: [
                { value: null, label: T.F.TASK_REPEAT.F.MONTHLY_MODE_DAY_OF_MONTH },
                { value: 1, label: T.F.TASK_REPEAT.F.ORD_FIRST },
                { value: 2, label: T.F.TASK_REPEAT.F.ORD_SECOND },
                { value: 3, label: T.F.TASK_REPEAT.F.ORD_THIRD },
                { value: 4, label: T.F.TASK_REPEAT.F.ORD_FOURTH },
                { value: -1, label: T.F.TASK_REPEAT.F.ORD_LAST },
              ],
            },
          },
          {
            key: 'monthlyWeekday',
            type: 'select',
            defaultValue: 1,
            resetOnHide: false,
            hideExpression: (model: any) => model.monthlyWeekOfMonth == null,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.WEEKDAY,
              options: [
                { value: 1, label: T.F.TASK_REPEAT.F.MONDAY },
                { value: 2, label: T.F.TASK_REPEAT.F.TUESDAY },
                { value: 3, label: T.F.TASK_REPEAT.F.WEDNESDAY },
                { value: 4, label: T.F.TASK_REPEAT.F.THURSDAY },
                { value: 5, label: T.F.TASK_REPEAT.F.FRIDAY },
                { value: 6, label: T.F.TASK_REPEAT.F.SATURDAY },
                { value: 0, label: T.F.TASK_REPEAT.F.SUNDAY },
              ],
            },
          },
        ],
      },
      {
        // Hide via a dynamic CSS class instead of `hideExpression`. With formly's
        // default `lazyRender`, hiding a field group destroys its child views and
        // recreates them on re-show, and the recreated mat-checkboxes lose their
        // wiring to the (re-registered) FormControls. After a cycle round-trip
        // (Week -> Month -> Week) the checkboxes then look enabled but are inert:
        // clicks no longer update the model (#8025). Keeping the group mounted and
        // toggling only its visibility preserves the control/view binding.
        // `resetOnHide: false` on each checkbox keeps the selection when the
        // CUSTOM container itself is hidden (quickSetting != CUSTOM).
        fieldGroupClassName: 'weekdays',
        expressionProperties: {
          // Weekdays do not apply after completion: "2 weeks after I complete it"
          // is stored as 14 days (toStoredRepeatCfg).
          className: (model: { repeatCycle: string; quickSetting: string }) =>
            model.repeatCycle === 'WEEKLY' &&
            model.quickSetting !== AFTER_COMPLETION_PRESET
              ? ''
              : 'repeat-cfg-hidden',
        },
        fieldGroup: [
          {
            key: 'monday',
            type: 'checkbox',
            resetOnHide: false,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.MONDAY,
            },
          },
          {
            key: 'tuesday',
            type: 'checkbox',
            resetOnHide: false,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.TUESDAY,
            },
          },
          {
            key: 'wednesday',
            type: 'checkbox',
            resetOnHide: false,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.WEDNESDAY,
            },
          },
          {
            key: 'thursday',
            type: 'checkbox',
            resetOnHide: false,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.THURSDAY,
            },
          },
          {
            key: 'friday',
            type: 'checkbox',
            resetOnHide: false,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.FRIDAY,
            },
          },
          {
            key: 'saturday',
            type: 'checkbox',
            resetOnHide: false,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.SATURDAY,
            },
          },
          {
            key: 'sunday',
            type: 'checkbox',
            resetOnHide: false,
            templateOptions: {
              label: T.F.TASK_REPEAT.F.SUNDAY,
            },
          },
        ],
      },
    ],
  },
  // REPEAT CFG END
];

// Shown next to the start date.
export const TASK_REPEAT_CFG_END_FORM_CFG: FormlyFieldConfig[] = [
  // Optional inclusive end day (#10091). The picker emits Date | null; persist
  // a YYYY-MM-DD string and `undefined` when cleared, so the clear syncs via
  // `clearedFields` instead of storing a null.
  {
    key: 'repeatUntilDay',
    type: 'date',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.REPEAT_UNTIL_DAY,
      description: T.F.TASK_REPEAT.F.REPEAT_UNTIL_DAY_DESCRIPTION,
    },
    parsers: [
      (value: Date | string | null | undefined) =>
        value instanceof Date ? getDbDateStr(value) : value || undefined,
    ],
    expressionProperties: {
      ['templateOptions.min']: (model: Partial<TaskRepeatCfg>) =>
        model.startDate || undefined,
    },
  },
];

// How the series behaves, first in Options.
export const TASK_REPEAT_CFG_BEHAVIOUR_FORM_CFG: FormlyFieldConfig[] = [
  // "If you fall behind": one choice for waitForCompletion + skipOverdue. The
  // `fallBehind` key is dialog-only; the component maps it to those fields and
  // sets the hint for the picked option. Hidden after completion, which waits.
  {
    key: 'fallBehind',
    type: 'select',
    resetOnHide: false,
    hideExpression: (model: any) => model.quickSetting === AFTER_COMPLETION_PRESET,
    templateOptions: {
      label: T.F.TASK_REPEAT.F.FALL_BEHIND,
      options: [
        { value: 'KEEP', label: T.F.TASK_REPEAT.F.FALL_BEHIND_KEEP },
        { value: 'LATEST', label: T.F.TASK_REPEAT.F.FALL_BEHIND_LATEST },
        { value: 'WAIT', label: T.F.TASK_REPEAT.F.FALL_BEHIND_WAIT },
      ],
    },
  },
  {
    key: 'isPaused',
    type: 'checkbox',
    defaultValue: false,
    templateOptions: {
      label: T.F.TASK_REPEAT.F.IS_PAUSED,
      description: T.F.TASK_REPEAT.F.IS_PAUSED_DESCRIPTION,
    },
  },
];

// What new copies get, after the tags in Options.
export const TASK_REPEAT_CFG_ADVANCED_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'priority',
    type: 'select',
    resetOnHide: false,
    templateOptions: {
      label: T.F.TASK.CMP.PRIORITY,
      options: [
        { value: null, label: T.F.TASK.CMP.PRIORITY_NONE },
        { value: 1, label: T.F.TASK.CMP.PRIORITY_LOW },
        { value: 2, label: T.F.TASK.CMP.PRIORITY_MEDIUM },
        { value: 3, label: T.F.TASK.CMP.PRIORITY_HIGH },
      ],
    },
  },
  {
    key: 'defaultEstimate',
    type: 'duration',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.DEFAULT_ESTIMATE,
      description: T.G.DURATION_DESCRIPTION,
    },
    // otherwise the input duration field messes up :(
    modelOptions: {
      updateOn: 'blur',
    },
  },

  {
    key: 'notes',
    type: 'textarea',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.NOTES,
      rows: 4,
    },
  },
  {
    key: 'shouldInheritSubtasks',
    type: 'checkbox',
    defaultValue: false,
    templateOptions: {
      label: T.F.TASK_REPEAT.F.INHERIT_SUBTASKS,
      description: T.F.TASK_REPEAT.F.INHERIT_SUBTASKS_DESCRIPTION,
    },
  },
  // child option depending on inherit
  {
    key: 'disableAutoUpdateSubtasks',
    type: 'checkbox',
    defaultValue: false,
    hideExpression: (model: any) => !model.shouldInheritSubtasks,
    templateOptions: {
      label: T.F.TASK_REPEAT.F.DISABLE_AUTO_UPDATE_SUBTASKS,
      description: T.F.TASK_REPEAT.F.DISABLE_AUTO_UPDATE_SUBTASKS_DESCRIPTION,
    },
    className: 'sp-formly-child-option',
  },
];
