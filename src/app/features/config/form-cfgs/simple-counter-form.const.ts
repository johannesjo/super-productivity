/* eslint-disable max-len */
import { ConfigFormSection } from '../global-config.model';
import {
  SimpleCounterConfig,
  SimpleCounterType,
} from '../../simple-counter/simple-counter.model';
import { T } from '../../../t.const';
import { EMPTY_SIMPLE_COUNTER } from '../../simple-counter/simple-counter.const';
import { nanoid } from 'nanoid';
import { FormlyFieldConfig } from '@ngx-formly/core/lib/models/fieldconfig';

export const SIMPLE_COUNTER_FORM: ConfigFormSection<SimpleCounterConfig> = {
  title: T.F.SIMPLE_COUNTER.FORM.TITLE,
  key: 'EMPTY',
  customSection: 'SIMPLE_COUNTER_CFG',
  help: T.F.SIMPLE_COUNTER.FORM.HELP,
  items: [
    {
      key: 'counters',
      type: 'repeat',
      templateOptions: {
        addText: T.F.SIMPLE_COUNTER.FORM.ADD_NEW,
        getInitialValue: () => ({
          ...EMPTY_SIMPLE_COUNTER,
          id: nanoid(),
          isEnabled: true,
        }),
      },
      fieldArray: {
        fieldGroup: [
          {
            type: 'checkbox',
            key: 'isEnabled',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_IS_ENABLED,
            },
          },
          {
            type: 'input',
            key: 'title',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
            },
          },
          {
            key: 'type',
            type: 'select',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_TYPE,
              required: true,
              options: [
                {
                  label: T.F.SIMPLE_COUNTER.FORM.TYPE_STOPWATCH,
                  value: SimpleCounterType.StopWatch,
                },
                {
                  label: T.F.SIMPLE_COUNTER.FORM.TYPE_CLICK_COUNTER,
                  value: SimpleCounterType.ClickCounter,
                },
                {
                  label: T.F.SIMPLE_COUNTER.FORM.TYPE_REPEATED_COUNTDOWN,
                  value: SimpleCounterType.RepeatedCountdownReminder,
                },
              ],
            },
          },
          {
            type: 'icon',
            key: 'icon',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_ICON,
              description: T.G.ICON_INP_DESCRIPTION,
            },
          },
          {
            key: 'countdownDuration',
            type: 'duration',
            hideExpression: (model: any) => {
              return model.type !== SimpleCounterType.RepeatedCountdownReminder;
            },
            hooks: {
              onInit: (field) => {
                console.log(field?.formControl?.value);
                if (!field?.formControl?.value && field?.formControl?.value !== null) {
                  field?.formControl?.setValue(30 * 60000);
                }
              },
            },
            templateOptions: {
              required: false,
              isAllowSeconds: false,
              label: T.F.SIMPLE_COUNTER.FORM.L_COUNTDOWN_DURATION,
              description: T.G.DURATION_DESCRIPTION,
            },
          },
          {
            type: 'checkbox',
            key: 'isTrackStreaks',
            templateOptions: {
              // label: T.F.SIMPLE_COUNTER.FORM.L_IS_ENABLED,
              label: 'Track Streaks',
            },
          },
          {
            type: 'input',
            key: 'streakMinValue',
            expressions: {
              hide: (fCfg: FormlyFieldConfig) =>
                fCfg.model.type === SimpleCounterType.StopWatch ||
                !fCfg.model.isTrackStreaks,
            },
            templateOptions: {
              // label: T.F.SIMPLE_COUNTER.FORM.L_IS_ENABLED,
              label: 'Daily goal for successful streak',
              type: 'number',
              min: 1,
              required: true,
              getInitialValue: () => 1,
            },
          },
          {
            type: 'duration',
            key: 'streakMinValue',
            expressions: {
              hide: (fCfg: FormlyFieldConfig) =>
                fCfg.model.type !== SimpleCounterType.StopWatch ||
                !fCfg.model.isTrackStreaks,
            },
            templateOptions: {
              // label: T.F.SIMPLE_COUNTER.FORM.L_IS_ENABLED,
              label: 'Daily goal for successful streak',
              min: 60 * 1000,
              required: true,
              description: T.G.DURATION_DESCRIPTION,
              getInitialValue: () => 10 * 60 * 1000,
            },
          },
        ],
      },
    },
  ],
};
