import {
  validateQuickAddTaskPayload,
  QuickAddTaskPayloadValidationContext,
} from './quick-add-task-payload-validator';
import { TaskReminderOptionId } from './task.model';
import { AddTaskPayload } from './add-task-bar/add-task-payload-builder';

describe('validateQuickAddTaskPayload', () => {
  const ctx: QuickAddTaskPayloadValidationContext = {
    projectIds: new Set(['INBOX_PROJECT', 'project-1']),
    tagIds: new Set(['tag-1', 'tag-2']),
  };

  const validPayload = (overrides: Partial<AddTaskPayload> = {}): AddTaskPayload => ({
    title: 'Task from HUD',
    taskData: {
      projectId: 'INBOX_PROJECT',
      tagIds: ['tag-1'],
      dueDay: '2026-06-20',
      timeEstimate: 25 * 60 * 1000,
    },
    isAddToBacklog: false,
    isAddToBottom: false,
    remindOption: TaskReminderOptionId.DoNotRemind,
    repeat: null,
    ...overrides,
  });

  it('accepts a normal quick-add payload', () => {
    expect(validateQuickAddTaskPayload(validPayload(), ctx)).toBeNull();
  });

  it('rejects unknown project ids before task creation', () => {
    expect(
      validateQuickAddTaskPayload(
        validPayload({ taskData: { projectId: 'missing-project' } }),
        ctx,
      ),
    ).toContain('Project is invalid');
  });

  it('rejects unknown tag ids before task creation', () => {
    expect(
      validateQuickAddTaskPayload(
        validPayload({
          taskData: { projectId: 'INBOX_PROJECT', tagIds: ['missing-tag'] },
        }),
        ctx,
      ),
    ).toContain('Tag is invalid');
  });

  it('rejects malformed dates and timestamps', () => {
    expect(
      validateQuickAddTaskPayload(
        validPayload({ taskData: { projectId: 'INBOX_PROJECT', dueDay: '20/06/2026' } }),
        ctx,
      ),
    ).toContain('Date is invalid');

    expect(
      validateQuickAddTaskPayload(
        validPayload({
          taskData: {
            projectId: 'INBOX_PROJECT',
            dueWithTime: Number.POSITIVE_INFINITY,
          },
        }),
        ctx,
      ),
    ).toContain('Timestamp is invalid');
  });

  it('rejects unbounded titles and new tag lists', () => {
    expect(
      validateQuickAddTaskPayload(validPayload({ title: 'x'.repeat(1001) }), ctx),
    ).toContain('Task title is too long');

    expect(
      validateQuickAddTaskPayload(
        validPayload({
          newTagTitles: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
        }),
        ctx,
      ),
    ).toContain('Too many new tags');
  });

  it('rejects invalid reminder and repeat values', () => {
    expect(
      validateQuickAddTaskPayload(
        validPayload({
          remindOption: 'bad-reminder' as TaskReminderOptionId,
        }),
        ctx,
      ),
    ).toContain('Reminder is invalid');

    expect(
      validateQuickAddTaskPayload(
        validPayload({
          repeat: { type: 'BAD_REPEAT' } as unknown as AddTaskPayload['repeat'],
        }),
        ctx,
      ),
    ).toContain('Repeat setting is invalid');

    expect(
      validateQuickAddTaskPayload(
        validPayload({
          repeat: {
            type: 'PRESET',
            quickSetting: 'CUSTOM',
          } as unknown as AddTaskPayload['repeat'],
        }),
        ctx,
      ),
    ).toContain('Repeat setting is invalid');

    expect(
      validateQuickAddTaskPayload(
        validPayload({
          repeat: { type: 'INTERVAL', repeatCycle: 'WEEKLY', repeatEvery: 0 },
        }),
        ctx,
      ),
    ).toContain('Repeat setting is invalid');
  });

  it('rejects a repeat config smuggled in without a matching recurrence', () => {
    // The main renderer builds the config for a DIALOG recurrence itself, so a
    // HUD payload that ships one alongside must not be trusted.
    expect(
      validateQuickAddTaskPayload(
        validPayload({
          repeat: { type: 'DIALOG' },
          repeatCfg: {
            startDate: '2026-06-20',
          } as unknown as AddTaskPayload['repeatCfg'],
        }),
        ctx,
      ),
    ).toContain('Repeat setting is invalid');

    expect(
      validateQuickAddTaskPayload(
        validPayload({
          repeat: null,
          repeatCfg: {
            startDate: '2026-06-20',
          } as unknown as AddTaskPayload['repeatCfg'],
        }),
        ctx,
      ),
    ).toContain('Repeat setting is invalid');
  });

  it('rejects malformed object shapes from IPC', () => {
    expect(
      validateQuickAddTaskPayload(
        {
          ...validPayload(),
          taskData: [] as unknown as AddTaskPayload['taskData'],
        },
        ctx,
      ),
    ).toContain('Task data is invalid');

    expect(
      validateQuickAddTaskPayload(
        {
          ...validPayload(),
          repeat: { type: 'PRESET', quickSetting: 'DAILY' },
          repeatCfg: {
            tagIds: 'tag-1' as unknown as string[],
          } as unknown as AddTaskPayload['repeatCfg'],
        },
        ctx,
      ),
    ).toContain('Tag is invalid');
  });
});
