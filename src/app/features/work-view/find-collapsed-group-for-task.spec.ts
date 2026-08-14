import { findCollapsedGroupForTask } from './find-collapsed-group-for-task';
import { TaskWithSubTasks } from '../tasks/task.model';

const task = (id: string, subTasks: TaskWithSubTasks[] = []): TaskWithSubTasks =>
  ({ id, subTasks }) as unknown as TaskWithSubTasks;

describe('findCollapsedGroupForTask()', () => {
  const grouped = {
    Today: [task('t1'), task('t2', [task('sub-1')])],
    Tomorrow: [task('t3')],
  };

  it('returns the collapsed group holding the task', () => {
    expect(findCollapsedGroupForTask(grouped, ['Today'], 't1')).toBe('Today');
  });

  it('finds a task hidden as a subtask of a grouped parent', () => {
    expect(findCollapsedGroupForTask(grouped, ['Today'], 'sub-1')).toBe('Today');
  });

  it('returns null when the holding group is already expanded', () => {
    expect(findCollapsedGroupForTask(grouped, ['Tomorrow'], 't1')).toBeNull();
  });

  it('returns null when the task is in no group at all', () => {
    expect(findCollapsedGroupForTask(grouped, ['Today', 'Tomorrow'], 'nope')).toBeNull();
  });

  it('returns null when grouping is off', () => {
    expect(findCollapsedGroupForTask(undefined, ['Today'], 't1')).toBeNull();
  });

  it('returns null when nothing is collapsed', () => {
    expect(findCollapsedGroupForTask(grouped, [], 't1')).toBeNull();
  });

  it('ignores a stale collapsed id that resolves off Object.prototype', () => {
    // 'constructor' would yield a function if the record were indexed directly.
    expect(() =>
      findCollapsedGroupForTask(grouped, ['constructor', 'toString'], 't1'),
    ).not.toThrow();
    expect(findCollapsedGroupForTask(grouped, ['constructor'], 't1')).toBeNull();
  });
});
