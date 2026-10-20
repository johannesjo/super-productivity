import {
  TASK_REPEAT_CFG_ADVANCED_FORM_CFG,
  TASK_REPEAT_CFG_ESSENTIAL_FORM_CFG,
} from './task-repeat-cfg-form.const';
import { T } from '../../../t.const';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { AFTER_COMPLETION_PRESET } from './after-completion-form-mapping';

describe('TaskRepeatCfgFormConfig', () => {
  it('should not contain startDate in essential form fields', () => {
    const startDateField = TASK_REPEAT_CFG_ESSENTIAL_FORM_CFG.find(
      (field) => field.key === 'startDate',
    );
    expect(startDateField).toBeUndefined();
  });

  it('should not contain startTime or remindAt in advanced form fields', () => {
    const flatFields = TASK_REPEAT_CFG_ADVANCED_FORM_CFG.flatMap((field) =>
      field.fieldGroup ? field.fieldGroup : [field],
    ).flatMap((field) => (field.fieldGroup ? field.fieldGroup : [field]));

    const startTimeField = flatFields.find((field) => field.key === 'startTime');
    const remindAtField = flatFields.find((field) => field.key === 'remindAt');

    expect(startTimeField).toBeUndefined();
    expect(remindAtField).toBeUndefined();
  });

  describe('repeatUntilDay field (#10091)', () => {
    const field = TASK_REPEAT_CFG_ADVANCED_FORM_CFG.find(
      (f) => f.key === 'repeatUntilDay',
    );
    const parse = (value: unknown): unknown => (field!.parsers![0] as any)(value);

    it('is an optional date field', () => {
      expect(field?.type).toBe('date');
      expect(field?.templateOptions?.required).toBeFalsy();
    });

    it('stores a picked Date as a local YYYY-MM-DD string', () => {
      expect(parse(new Date(2026, 2, 5, 0, 0))).toBe('2026-03-05');
    });

    it('stores a cleared picker as undefined, never null', () => {
      expect(parse(null)).toBeUndefined();
      expect(parse(undefined)).toBeUndefined();
    });

    it('keeps an already-stored string untouched', () => {
      expect(parse('2026-03-05')).toBe('2026-03-05');
    });

    it('uses the start date as the minimum', () => {
      const minExpr = field?.expressionProperties?.['templateOptions.min'] as (
        m: unknown,
      ) => unknown;
      expect(minExpr({ startDate: '2026-01-10' })).toBe('2026-01-10');
      expect(minExpr({})).toBeUndefined();
    });
  });

  it('explains that Day of month uses the start date (#8886)', () => {
    const repeatContainer = TASK_REPEAT_CFG_ESSENTIAL_FORM_CFG.find(
      (field) => field.fieldGroupClassName === 'repeat-config-container',
    );
    const monthlyAnchor = repeatContainer?.fieldGroup?.find(
      (field) => field.fieldGroupClassName === 'monthly-anchor',
    );
    const monthlyPattern = monthlyAnchor?.fieldGroup?.find(
      (field) => field.key === 'monthlyWeekOfMonth',
    );

    expect(monthlyPattern?.templateOptions?.description).toBe(
      T.F.TASK_REPEAT.F.MONTHLY_MODE_DAY_OF_MONTH_DESCRIPTION,
    );
  });

  describe('after completion (#5388)', () => {
    const repeatContainer = TASK_REPEAT_CFG_ESSENTIAL_FORM_CFG.find(
      (field) => field.fieldGroupClassName === 'repeat-config-container',
    );
    const hide = (field: FormlyFieldConfig | undefined, model: object): boolean =>
      (field?.hideExpression as (m: object) => boolean)(model);

    it('shows the custom block for Custom and for the after-completion preset', () => {
      expect(hide(repeatContainer, { quickSetting: 'CUSTOM' })).toBe(false);
      expect(hide(repeatContainer, { quickSetting: AFTER_COMPLETION_PRESET })).toBe(
        false,
      );
      expect(hide(repeatContainer, { quickSetting: 'DAILY' })).toBe(true);
    });

    it('puts the schedule type first in the custom block, as translated radios', () => {
      const scheduleType = repeatContainer?.fieldGroup?.[0];
      expect(scheduleType?.key).toBe('repeatFromCompletionDate');
      expect(scheduleType?.type).toBe('radio');
      expect(scheduleType?.hideExpression).toBeUndefined();
      expect(scheduleType?.templateOptions?.options).toEqual([
        { value: false, label: T.F.TASK_REPEAT.F.SCHEDULE_TYPE_FIXED },
        { value: true, label: T.F.TASK_REPEAT.F.SCHEDULE_TYPE_AFTER_COMPLETION },
      ]);
    });

    it('no longer offers the schedule type in the advanced form', () => {
      expect(
        TASK_REPEAT_CFG_ADVANCED_FORM_CFG.some(
          (f) => f.key === 'repeatFromCompletionDate',
        ),
      ).toBe(false);
    });

    it('hides the monthly pattern after completion', () => {
      const monthlyAnchor = repeatContainer?.fieldGroup?.find(
        (field) => field.fieldGroupClassName === 'monthly-anchor',
      );
      expect(
        hide(monthlyAnchor, { repeatCycle: 'MONTHLY', quickSetting: 'CUSTOM' }),
      ).toBe(false);
      expect(
        hide(monthlyAnchor, {
          repeatCycle: 'MONTHLY',
          quickSetting: AFTER_COMPLETION_PRESET,
        }),
      ).toBe(true);
    });

    it('hides "only create next task after completion", which is implied there', () => {
      const wait = TASK_REPEAT_CFG_ADVANCED_FORM_CFG.find(
        (f) => f.key === 'waitForCompletion',
      );
      expect(hide(wait, { quickSetting: 'CUSTOM' })).toBe(false);
      expect(hide(wait, { quickSetting: AFTER_COMPLETION_PRESET })).toBe(true);
      expect(wait?.resetOnHide).toBe(false);
    });
  });

  describe('weekdays group visibility (issue #8025)', () => {
    const repeatContainer = TASK_REPEAT_CFG_ESSENTIAL_FORM_CFG.find(
      (field) => field.fieldGroupClassName === 'repeat-config-container',
    );
    const weekdaysGroup = repeatContainer?.fieldGroup?.find(
      (field) => field.fieldGroupClassName === 'weekdays',
    );
    const WEEKDAY_KEYS = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    it('should locate the weekdays group', () => {
      expect(weekdaysGroup).toBeDefined();
      expect(weekdaysGroup?.fieldGroup?.length).toBe(7);
    });

    // Regression guard for #8025: a `hideExpression` makes formly destroy and
    // recreate the checkbox views on every cycle switch, which breaks their
    // wiring to the FormControls (clicks stop updating the model after a
    // Week -> Month -> Week round-trip). Visibility must be driven by CSS instead.
    it('should NOT use hideExpression (it would re-freeze the checkboxes)', () => {
      expect(weekdaysGroup?.hideExpression).toBeUndefined();
    });

    it('should toggle visibility via a dynamic className bound to repeatCycle', () => {
      const className = weekdaysGroup?.expressionProperties?.['className'] as (model: {
        repeatCycle: string;
      }) => string;
      expect(className).toEqual(jasmine.any(Function));
      expect(className({ repeatCycle: 'WEEKLY' })).toBe('');
      expect(className({ repeatCycle: 'MONTHLY' })).toBe('repeat-cfg-hidden');
      expect(className({ repeatCycle: 'YEARLY' })).toBe('repeat-cfg-hidden');
      expect(className({ repeatCycle: 'DAILY' })).toBe('repeat-cfg-hidden');
    });

    it('hides the weekdays after completion, where weeks are a plain interval (#5388)', () => {
      const className = weekdaysGroup?.expressionProperties?.['className'] as (model: {
        repeatCycle: string;
        quickSetting: string;
      }) => string;
      expect(className({ repeatCycle: 'WEEKLY', quickSetting: 'CUSTOM' })).toBe('');
      expect(
        className({ repeatCycle: 'WEEKLY', quickSetting: AFTER_COMPLETION_PRESET }),
      ).toBe('repeat-cfg-hidden');
    });

    // The group stays mounted, but the CUSTOM container above it still hides via
    // hideExpression. Each checkbox needs resetOnHide:false so the selection
    // survives a quickSetting != CUSTOM round-trip instead of being wiped.
    it('should keep every weekday checkbox value across hide (resetOnHide:false)', () => {
      WEEKDAY_KEYS.forEach((key) => {
        const field = weekdaysGroup?.fieldGroup?.find((f) => f.key === key);
        expect(field).withContext(`weekday field "${key}" exists`).toBeDefined();
        expect(field?.resetOnHide)
          .withContext(`weekday field "${key}" resetOnHide`)
          .toBe(false);
      });
    });
  });
});
