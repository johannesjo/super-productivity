import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  reduceDomain,
  type DomainState,
  type Task,
} from '@noura/domain';
import {
  DomainSearchIndex,
  GlobalShortcuts,
  IdleDetection,
  NotificationService,
  ReminderScheduler,
  TakeABreak,
  TrackingReminder,
  type NotificationPort,
  type ShortcutPort,
} from './index';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Remind me',
  notes: '',
  status: 'open',
  priority: 0,
  projectId: 'inbox',
  subtaskIds: [],
  tagIds: [],
  checklist: [],
  sections: [],
  attachments: [],
  estimateMs: 0,
  trackedMs: 0,
  createdAt: 1,
  updatedAt: 1,
  order: 0,
  ...overrides,
});

class FakeClock {
  nowValue = 1_000_000;
  now(): number {
    return this.nowValue;
  }
  today(): string {
    return new Date(this.nowValue).toISOString().slice(0, 10);
  }
}

const withTask = (state: DomainState): DomainState =>
  reduceDomain(state, { type: 'task/add', payload: { task: task() } });

describe('ReminderScheduler', () => {
  it('fires each due reminder once, even across repeated checks', () => {
    const clock = new FakeClock();
    clock.nowValue = 2_000_000;
    const fired: string[] = [];
    const scheduler = new ReminderScheduler({
      clock,
      onReminder: (remindedTask) => fired.push(remindedTask.id),
    });
    let state = withTask(createInitialState(1));
    state = reduceDomain(state, {
      type: 'task/update',
      payload: { id: 'task-1', patch: { reminderAt: new Date(1_500_000).toISOString() } },
    });

    scheduler.check(state);
    scheduler.check(state);

    expect(fired).toEqual(['task-1']);
  });

  it('does not fire future reminders and respects the enable switch', () => {
    const clock = new FakeClock();
    clock.nowValue = 1_000_000;
    const fired: string[] = [];
    const scheduler = new ReminderScheduler({
      clock,
      onReminder: (remindedTask) => fired.push(remindedTask.id),
    });
    let state = reduceDomain(createInitialState(1), {
      type: 'task/add',
      payload: { task: task({ reminderAt: new Date(2_000_000).toISOString() }) },
    });
    scheduler.check(state);
    expect(fired).toEqual([]);

    const disabled = new ReminderScheduler({
      clock,
      isEnabled: () => false,
      onReminder: (remindedTask) => fired.push(remindedTask.id),
    });
    state = reduceDomain(state, {
      type: 'task/update',
      payload: { id: 'task-1', patch: { reminderAt: new Date(500_000).toISOString() } },
    });
    disabled.check(state);
    expect(fired).toEqual([]);
  });
});

describe('TrackingReminder', () => {
  it('nudges after the configured tracked duration, once per entry', () => {
    const clock = new FakeClock();
    clock.nowValue = 100_000;
    const nudged: string[] = [];
    const tracking = new TrackingReminder({
      clock,
      state: () => ({ activeEntryId: 's1', startedAt: 60_000 }),
      onReminder: (id) => nudged.push(id),
    });
    clock.nowValue = 60_000 + 15 * 60_000 + 1;
    tracking.check(15);
    tracking.check(15);
    expect(nudged).toEqual(['s1']);
  });

  it('re-arms when a new entry starts', () => {
    const clock = new FakeClock();
    let pulse = { activeEntryId: 's1', startedAt: 60_000 };
    const nudged: string[] = [];
    const tracking = new TrackingReminder({
      clock,
      state: () => pulse,
      onReminder: (id) => nudged.push(id),
    });
    clock.nowValue = 1_000_000;
    tracking.check(15);
    pulse = { activeEntryId: 's2', startedAt: 1_000_000 };
    clock.nowValue = 2_000_000;
    tracking.check(15);
    expect(nudged).toEqual(['s1', 's2']);
  });
});

describe('TakeABreak', () => {
  it('prompts after the configured focus interval and resets on pause', () => {
    const clock = new FakeClock();
    const prompted: string[] = [];
    const takeABreak = new TakeABreak({
      clock,
      state: () => ({ activeEntryId: 's1', startedAt: 0 }),
      onTakeABreak: (id) => prompted.push(id),
    });
    clock.nowValue = 31 * 60_000;
    takeABreak.check(30);
    clock.nowValue = 60 * 60_000;
    takeABreak.check(30);
    expect(prompted).toEqual(['s1']);
    takeABreak.reset('s1');
    clock.nowValue = 61 * 60_000;
    takeABreak.check(30);
    expect(prompted).toEqual(['s1', 's1']);
  });
});

describe('IdleDetection', () => {
  it('detects idle past the threshold and builds a deterministic split', async () => {
    const idle = new IdleDetection({
      idle: { getIdleMs: () => 500_000 },
      isEnabled: () => true,
    });
    expect(await idle.isIdlePast(300_000)).toBe(true);
    expect(await idle.isIdlePast(600_000)).toBe(false);

    const entry = {
      id: 's1',
      taskId: 'task-1',
      mode: 'flowtime' as const,
      startedAt: 100,
      endedAt: undefined,
      durationMs: 0,
      source: 'timer' as const,
      updatedAt: 100,
    };
    const batch = IdleDetection.splitCommands(entry, 400, 500);
    expect(batch).toEqual([
      { type: 'session/stop', payload: { id: 's1', endedAt: 400, durationMs: 300 } },
      {
        type: 'session/manual',
        payload: {
          entry: {
            id: 's1-idle',
            taskId: 'task-1',
            mode: 'flowtime',
            startedAt: 500,
            endedAt: undefined,
            durationMs: 0,
            source: 'timer',
            updatedAt: 500,
          },
        },
      },
    ]);
  });

  it('is a no-op when disabled', async () => {
    const idle = new IdleDetection({
      idle: { getIdleMs: () => 500_000 },
      isEnabled: () => false,
    });
    expect(await idle.isIdlePast(300_000)).toBe(false);
  });
});

describe('searchDomain', () => {
  const buildState = (): DomainState => {
    const initial = createInitialState(1);
    const withStudy = reduceDomain(initial, {
      type: 'project/add',
      payload: {
        project: {
          id: 'study',
          title: 'Study',
          color: 'blue',
          icon: 'book-open',
          archived: false,
          createdAt: 1,
        },
      },
    });
    const withTask = reduceDomain(withStudy, {
      type: 'task/add',
      payload: {
        task: task({
          id: 't1',
          title: 'Read distributed systems',
          notes: 'raft consensus',
          projectId: 'study',
        }),
      },
    });
    return reduceDomain(withTask, {
      type: 'tag/add',
      payload: { tag: { id: 'reading', title: 'reading', color: 'blue' } },
    });
  };

  it('finds tasks by title and ranks prefix matches first', () => {
    const state = buildState();
    const index = new DomainSearchIndex(() => state);
    const results = index.search('distributed');
    expect(results[0]).toMatchObject({ kind: 'task', id: 't1' });
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it('finds tags and projects and respects the limit', () => {
    const state = buildState();
    const results = new DomainSearchIndex(() => state).search('read');
    expect(
      results.some((result) => result.kind === 'tag' && result.title === 'reading'),
    ).toBe(true);
    const limited = new DomainSearchIndex(() => state).search('read', { limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it('handles empty queries safely', () => {
    const results = new DomainSearchIndex(() => buildState()).search('   ');
    expect(results).toEqual([]);
  });
});

describe('NotificationService', () => {
  const port = (): NotificationPort & { calls: unknown[] } => {
    const calls: unknown[] = [];
    return {
      calls,
      requestPermission: async () => {
        calls.push('permission');
        return true;
      },
      notify: async (title: string, body: string) => {
        calls.push([title, body]);
      },
    };
  };

  it('requests permission then delivers notifications', async () => {
    const notify = port();
    const service = new NotificationService({ notify });
    expect(await service.notify({ title: 'Due', body: 'Task is due' })).toBe(true);
    expect(notify.calls).toEqual(['permission', ['Due', 'Task is due']]);
  });

  it('respects the enabled switch', async () => {
    const notify = port();
    const service = new NotificationService({ notify, isEnabled: () => false });
    expect(await service.notify({ title: 'Due', body: 'Task is due' })).toBe(false);
    expect(notify.calls).toEqual([]);
  });
});

describe('GlobalShortcuts', () => {
  const port = (): ShortcutPort & { registered: string[]; unregistered: string[] } => {
    const registered: string[] = [];
    const unregistered: string[] = [];
    return {
      registered,
      unregistered,
      register: async (accelerator: string) => {
        registered.push(accelerator);
        return () => unregistered.push(accelerator);
      },
    };
  };

  it('registers, swaps, and disposes bindings', async () => {
    const shortcuts = port();
    const service = new GlobalShortcuts({ shortcuts });
    await service.register({
      id: 'search',
      accelerator: 'CmdOrCtrl+K',
      handler: () => undefined,
    });
    await service.register({
      id: 'search',
      accelerator: 'CmdOrCtrl+Shift+K',
      handler: () => undefined,
    });
    expect(shortcuts.unregistered).toEqual(['CmdOrCtrl+K']);
    await service.dispose();
    expect(shortcuts.unregistered).toEqual(['CmdOrCtrl+K', 'CmdOrCtrl+Shift+K']);
  });
});
