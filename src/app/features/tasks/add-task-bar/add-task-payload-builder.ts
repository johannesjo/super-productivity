import { TaskCopy, TaskReminderOptionId } from '../task.model';
import { TaskAttachment } from '../task-attachment/task-attachment.model';
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfgCopy,
} from '../../task-repeat-cfg/task-repeat-cfg.model';
import { AddTaskBarRepeat, AddTaskBarState } from './add-task-bar.const';
import { rollWeekendDateForRepeat } from './roll-weekend-date-for-repeat';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { isValidSplitTime } from '../../../util/is-valid-split-time';
import { remindOptionToMilliseconds } from '../util/remind-option-to-milliseconds';
import { unique } from '../../../util/unique';
import { getQuickSettingUpdates } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/get-quick-setting-updates';
import { getIntervalRepeatUpdates } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/get-interval-repeat-updates';
import { getDefaultSkipOverdue } from '../../task-repeat-cfg/dialog-edit-task-repeat-cfg/get-default-skip-overdue';

/**
 * Everything the add-task bar decided, in a plain-data form that survives a
 * structured clone. The Quick Add HUD renderer builds it and hands it to the
 * main renderer over IPC, which is why nothing here may be a class instance,
 * a signal or a function.
 */
export interface AddTaskPayload {
  title: string;
  taskData: Partial<TaskCopy>;
  isAddToBacklog: boolean;
  isAddToBottom: boolean;
  remindOption: TaskReminderOptionId;
  repeat: AddTaskBarRepeat | null;
  /**
   * Only set for a repeat the bar can create on its own; a `DIALOG` recurrence
   * defers the whole config to the repeat dialog and carries none.
   */
  repeatCfg?: Omit<TaskRepeatCfgCopy, 'id'>;
  newTagTitles?: string[];
}

export type AddTaskSubmitResult =
  | {
      ok: true;
      taskId: string;
    }
  | {
      ok: false;
      error: string;
    };

export interface BuildAddTaskPayloadParams {
  title: string;
  state: AddTaskBarState;
  note: string;
  isAddToBacklog: boolean;
  isAddToBottom: boolean;
  todayStr: string;
  defaultRemindOption: TaskReminderOptionId;
  finalTagIds?: string[];
  additionalFields?: Partial<TaskCopy>;
  newTagTitles?: string[];
}

export const buildAddTaskPayload = ({
  title,
  state,
  note,
  isAddToBacklog,
  isAddToBottom,
  todayStr,
  defaultRemindOption,
  finalTagIds = unique([...state.tagIds, ...state.tagIdsFromTxt]),
  additionalFields,
  newTagTitles,
}: BuildAddTaskPayloadParams): AddTaskPayload => {
  const taskData: Partial<TaskCopy> = {
    ...additionalFields,
    projectId: state.projectId,
    tagIds: additionalFields?.tagIds
      ? unique([...finalTagIds, ...additionalFields.tagIds])
      : finalTagIds,
    // needs to be 0
    timeEstimate: state.estimate || 0,
    attachments: _getAttachments(state.attachments, additionalFields),
  };

  if (note) {
    taskData.notes = note;
  }
  if (state.spent) {
    taskData.timeSpentOnDay = state.spent;
  }
  if (state.deadlineDate) {
    _applyDeadline(taskData, state);
  }

  // One day for the whole submit. A Monday-to-Friday schedule has no weekend
  // occurrence, so a weekend day is one the task never starts on: the
  // occurrence engine moves it to the following Monday off the config's weekday
  // flags (getFirstRepeatOccurrence), while the weekend day stays behind in the
  // config's `startDate` — where the repeat dialog re-derives every later quick
  // setting from it, turning "weekly on current weekday" into a Saturday
  // recurrence.
  //
  // Rolled here rather than on the date chip, so the day the user picked stays
  // the day the bar shows and the repeat menu's labels are built from. Computed
  // once, so the task's due day and the config's start date cannot disagree
  // across a logical-day rollover between two `todayStr()` calls.
  const startDay = rollWeekendDateForRepeat(state.date || todayStr, state.repeat);
  _applyDueDate(taskData, state, startDay);

  const remindOption = state.remindOption ?? defaultRemindOption;

  return {
    title,
    taskData,
    isAddToBacklog,
    isAddToBottom,
    remindOption,
    repeat: state.repeat,
    repeatCfg:
      state.repeat && state.repeat.type !== 'DIALOG'
        ? _buildRepeatCfg(title, taskData, state, state.repeat, startDay, remindOption)
        : undefined,
    newTagTitles,
  };
};

const _getAttachments = (
  stateAttachments: TaskAttachment[],
  additionalFields?: Partial<TaskCopy>,
): TaskAttachment[] =>
  stateAttachments.length > 0 ? stateAttachments : additionalFields?.attachments || [];

const _applyDeadline = (taskData: Partial<TaskCopy>, state: AddTaskBarState): void => {
  if (!state.deadlineDate) {
    return;
  }
  if (state.deadlineTime && isValidSplitTime(state.deadlineTime)) {
    const deadlineTimestamp = getDateTimeFromClockString(
      state.deadlineTime,
      dateStrToUtcDate(state.deadlineDate),
    );
    taskData.deadlineWithTime = deadlineTimestamp;
    if (
      state.deadlineRemindOption &&
      state.deadlineRemindOption !== TaskReminderOptionId.DoNotRemind
    ) {
      taskData.deadlineRemindAt = remindOptionToMilliseconds(
        deadlineTimestamp,
        state.deadlineRemindOption,
      );
    }
  } else {
    taskData.deadlineDay = state.deadlineDate;
  }
};

const _applyDueDate = (
  taskData: Partial<TaskCopy>,
  state: AddTaskBarState,
  startDay: string,
): void => {
  if (state.date) {
    // Parse date components to create date in local timezone
    // This avoids timezone issues when parsing date strings like "2024-01-15"
    const [year, month, day] = startDay.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (state.time) {
      const [hours, minutes] = state.time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      taskData.dueWithTime = date.getTime();
      taskData.hasPlannedTime = true;
    } else {
      taskData.dueDay = startDay;
    }
  } else if (state.repeat && state.repeat.type !== 'DIALOG') {
    // When a recurrence is set without an explicit date, set dueDay to today
    // so the first task instance appears as today's occurrence instead of
    // staying in inbox
    taskData.dueDay = startDay;
  } else {
    // Explicitly set dueDay to undefined when no date is selected
    // This prevents automatic assignment of today's date in TODAY context
    taskData.dueDay = undefined;
  }
};

const _buildRepeatCfg = (
  title: string,
  taskData: Partial<TaskCopy>,
  state: AddTaskBarState,
  repeat: Exclude<AddTaskBarRepeat, { type: 'DIALOG' }>,
  startDay: string,
  remindOption: TaskReminderOptionId,
): Omit<TaskRepeatCfgCopy, 'id'> => {
  const referenceDate = dateStrToUtcDate(startDay);
  // An interval ("@every 2 days") has no preset to expand — it maps to a
  // CUSTOM config carrying the cycle and interval directly.
  const repeatUpdates =
    repeat.type === 'INTERVAL'
      ? getIntervalRepeatUpdates(repeat.repeatCycle, repeat.repeatEvery, referenceDate)
      : {
          quickSetting: repeat.quickSetting,
          ...getQuickSettingUpdates(repeat.quickSetting, referenceDate),
        };
  const newRepeatCfg = {
    ...DEFAULT_TASK_REPEAT_CFG,
    startDate: startDay,
    ...repeatUpdates,
    title,
    notes: taskData.notes,
    tagIds: taskData.tagIds ?? [],
    defaultEstimate: state.estimate || 0,
    startTime: state.time || undefined,
    remindAt: state.time ? remindOption : undefined,
  };
  // Seed the skipOverdue default from the chosen schedule, same as the repeat
  // dialog (there is no advanced toggle in the inline add-bar).
  return {
    ...newRepeatCfg,
    skipOverdue: getDefaultSkipOverdue(newRepeatCfg),
  };
};
