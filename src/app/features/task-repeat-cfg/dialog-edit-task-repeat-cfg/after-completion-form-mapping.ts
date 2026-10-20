import type { RepeatQuickSetting, TaskRepeatCfgCopy } from '../task-repeat-cfg.model';

/**
 * Dialog-only preset for "After I complete it…" (#5388). It never leaves the
 * dialog: released clients validate `quickSetting` against
 * `RepeatQuickSetting`, so the stored shape stays `CUSTOM` +
 * `repeatFromCompletionDate`.
 */
export const AFTER_COMPLETION_PRESET = 'AFTER_COMPLETION' as const;

export type RepeatDialogPreset = RepeatQuickSetting | typeof AFTER_COMPLETION_PRESET;

type MappedFields = Pick<
  TaskRepeatCfgCopy,
  | 'quickSetting'
  | 'repeatCycle'
  | 'repeatEvery'
  | 'repeatFromCompletionDate'
  | 'waitForCompletion'
  | 'monthlyWeekOfMonth'
  | 'monthlyWeekday'
  | 'monthlyLastDay'
>;

export type RepeatCfgFormModel<TCfg extends MappedFields> = Omit<TCfg, 'quickSetting'> & {
  quickSetting: RepeatDialogPreset;
};

const DAYS_PER_WEEK = 7;

/**
 * Stored config → dialog model. Any after-completion config opens on the
 * "After I complete it…" preset, and whole weeks stored as days are shown as
 * weeks again (see `toStoredRepeatCfg`).
 */
export const toRepeatCfgFormModel = <TCfg extends MappedFields>(
  cfg: TCfg,
): RepeatCfgFormModel<TCfg> => {
  if (!cfg.repeatFromCompletionDate) {
    return cfg as RepeatCfgFormModel<TCfg>;
  }
  const isWholeWeeks =
    cfg.repeatCycle === 'DAILY' &&
    cfg.repeatEvery >= DAYS_PER_WEEK &&
    cfg.repeatEvery % DAYS_PER_WEEK === 0;
  return {
    ...cfg,
    quickSetting: AFTER_COMPLETION_PRESET,
    ...(isWholeWeeks
      ? { repeatCycle: 'WEEKLY' as const, repeatEvery: cfg.repeatEvery / DAYS_PER_WEEK }
      : {}),
  } as RepeatCfgFormModel<TCfg>;
};

/**
 * Dialog model → stored config. What the dialog shows is what is written:
 * - "After I complete it…" is stored as `CUSTOM` + `repeatFromCompletionDate`,
 *   and always waits for completion, so only one copy is open at a time.
 * - "N weeks after completion" is stored as `DAILY` × 7N. A weekly cycle
 *   without a weekday never fires on any client (getNewestPossibleDueDate),
 *   while every released client computes days from the completion day.
 * - Weekday and monthly anchors are hidden in that mode, so the monthly ones
 *   are cleared; weekday flags are ignored by a daily cycle and left as they are.
 * - A fixed preset never keeps a hidden `repeatFromCompletionDate`.
 */
export const toStoredRepeatCfg = <TCfg extends MappedFields>(
  model: RepeatCfgFormModel<TCfg>,
): TCfg => {
  if (model.quickSetting !== AFTER_COMPLETION_PRESET) {
    const fixed = model as TCfg;
    return fixed.repeatFromCompletionDate
      ? { ...fixed, repeatFromCompletionDate: false }
      : fixed;
  }
  const repeatEvery = Number(model.repeatEvery) || 1;
  const isWeeks = model.repeatCycle === 'WEEKLY';
  return {
    ...model,
    quickSetting: 'CUSTOM',
    repeatFromCompletionDate: true,
    waitForCompletion: true,
    repeatCycle: isWeeks ? 'DAILY' : model.repeatCycle,
    repeatEvery: isWeeks ? repeatEvery * DAYS_PER_WEEK : repeatEvery,
    monthlyWeekOfMonth: undefined,
    monthlyWeekday: undefined,
    monthlyLastDay: undefined,
  } as TCfg;
};

const AFTER_COMPLETION_SCHEDULE_KEYS = [
  'repeatCycle',
  'repeatEvery',
  'monthlyWeekOfMonth',
  'monthlyWeekday',
  'monthlyLastDay',
] as const;

/**
 * A stored after-completion config can predate the dialog's representation
 * (a weekday-based weekly cycle, monthly anchors). Rewriting those
 * schedule-affecting fields makes rescheduleTaskOnRepeatCfgUpdate$ relocate the
 * open copy, e.g. move an overdue one into the future. So they are only
 * converted when the user edited the schedule in the dialog; an unrelated save
 * keeps the stored schedule as it is (waiting still applies, it moves nothing).
 */
export const keepUneditedAfterCompletionSchedule = <TCfg extends MappedFields>(
  initial: TCfg,
  model: RepeatCfgFormModel<TCfg>,
  stored: TCfg,
): TCfg => {
  if (!initial.repeatFromCompletionDate || !stored.repeatFromCompletionDate) {
    return stored;
  }
  const shownInitially = toRepeatCfgFormModel(initial);
  const isScheduleEdited =
    shownInitially.quickSetting !== model.quickSetting ||
    shownInitially.repeatCycle !== model.repeatCycle ||
    Number(shownInitially.repeatEvery) !== Number(model.repeatEvery);
  if (isScheduleEdited) {
    return stored;
  }
  const kept = { ...stored };
  for (const key of AFTER_COMPLETION_SCHEDULE_KEYS) {
    (kept as Record<string, unknown>)[key] = initial[key];
  }
  return kept;
};

export type AfterCompletionModeState = Pick<
  RepeatCfgFormModel<MappedFields>,
  'quickSetting' | 'repeatFromCompletionDate'
>;

/**
 * Keeps the preset select and the "Schedule type" radio in step. Picking
 * "After I complete it…" in either control switches the other one; leaving the
 * mode restores the waiting behaviour the config had as a fixed schedule.
 *
 * `prev` must be a snapshot taken before the change: formly writes into the
 * model object it was given, so the previous signal value is already mutated.
 */
export const syncAfterCompletionMode = <TModel extends AfterCompletionModeState>(
  prev: AfterCompletionModeState,
  next: TModel,
  fixedWaitForCompletion: boolean,
): TModel => {
  const wasAfter = prev.quickSetting === AFTER_COMPLETION_PRESET;
  const isPresetChange = prev.quickSetting !== next.quickSetting;
  if (isPresetChange) {
    if (next.quickSetting === AFTER_COMPLETION_PRESET) {
      return { ...next, repeatFromCompletionDate: true, waitForCompletion: true };
    }
    if (wasAfter) {
      return {
        ...next,
        repeatFromCompletionDate: false,
        waitForCompletion: fixedWaitForCompletion,
      };
    }
    return next;
  }
  const isModeChange =
    !!prev.repeatFromCompletionDate !== !!next.repeatFromCompletionDate;
  if (isModeChange) {
    return next.repeatFromCompletionDate
      ? { ...next, quickSetting: AFTER_COMPLETION_PRESET, waitForCompletion: true }
      : { ...next, quickSetting: 'CUSTOM', waitForCompletion: fixedWaitForCompletion };
  }
  return next;
};

export const isCustomOrAfterCompletionPreset = (
  quickSetting: RepeatDialogPreset | undefined,
): boolean => quickSetting === 'CUSTOM' || quickSetting === AFTER_COMPLETION_PRESET;
