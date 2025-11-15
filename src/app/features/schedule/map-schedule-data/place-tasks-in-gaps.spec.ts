import { placeTasksInGaps } from './place-tasks-in-gaps';
import { BlockedBlock } from '../schedule.model';
import { TaskWithoutReminder } from '../../tasks/task.model';

describe('placeTasksInGaps', () => {
  it('should place tasks in gaps without splitting when they fit', () => {
    // Arrange
    const startTime = new Date('2025-11-04T08:00:00').getTime();
    const endTime = new Date('2025-11-04T17:00:00').getTime();

    const tasks: TaskWithoutReminder[] = [
      {
        id: 'task-a',
        title: 'Task A',
        timeEstimate: 30 * 60 * 1000, // 30 minutes
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
      {
        id: 'task-b',
        title: 'Task B',
        timeEstimate: 45 * 60 * 1000, // 45 minutes
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
      {
        id: 'task-c',
        title: 'Task C',
        timeEstimate: 60 * 60 * 1000, // 1 hour
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
    ];

    const blockedBlocks: BlockedBlock[] = [
      {
        start: new Date('2025-11-04T09:00:00').getTime(),
        end: new Date('2025-11-04T10:00:00').getTime(),
        entries: [],
      },
      {
        start: new Date('2025-11-04T13:00:00').getTime(),
        end: new Date('2025-11-04T13:30:00').getTime(),
        entries: [],
      },
    ];

    // Act
    const result = placeTasksInGaps(tasks, blockedBlocks, startTime, endTime);

    // Assert
    expect(result.viewEntries.length).toBe(3);

    // With BEST_FIT algorithm, tasks are placed to minimize wasted space:
    // Iteration 1: Task C (60min) perfectly fits first gap (08:00-09:00) - 0 waste
    // Iteration 2: Task B (45min) has less waste than A in remaining gap:
    //              B in gap(180min) = 135min waste vs A in gap(180min) = 150min waste
    //              So B is placed at 10:00
    // Iteration 3: Task A (30min) placed at 10:45 in remaining space

    // Task C (60min) should perfectly fit first gap (08:00-09:00)
    const taskC = result.viewEntries.find((r) => r.id === 'task-c');
    expect(taskC).toBeDefined();
    expect(taskC!.start).toBe(startTime); // 08:00

    // Task B (45min) should be placed first in second gap (better fit than A)
    const taskB = result.viewEntries.find((r) => r.id === 'task-b');
    expect(taskB).toBeDefined();
    expect(taskB!.start).toBe(new Date('2025-11-04T10:00:00').getTime()); // 10:00

    // Task A (30min) should be placed after Task B in second gap
    const taskA = result.viewEntries.find((r) => r.id === 'task-a');
    expect(taskA).toBeDefined();
    const fortyFiveMinutesInMs = 45 * 60 * 1000;
    expect(taskA!.start).toBe(
      new Date('2025-11-04T10:00:00').getTime() + fortyFiveMinutesInMs,
    ); // 10:45
  });

  it('should place large tasks after blocks if they do not fit in gaps', () => {
    // Arrange
    const startTime = new Date('2025-11-04T08:00:00').getTime();
    const endTime = new Date('2025-11-04T17:00:00').getTime();

    const tasks: TaskWithoutReminder[] = [
      {
        id: 'task-large',
        title: 'Large Task',
        timeEstimate: 180 * 60 * 1000, // 3 hours - too large for first gap
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
    ];

    const blockedBlocks: BlockedBlock[] = [
      {
        start: new Date('2025-11-04T09:00:00').getTime(),
        end: new Date('2025-11-04T10:00:00').getTime(),
        entries: [],
      },
    ];

    // Act
    const result = placeTasksInGaps(tasks, blockedBlocks, startTime, endTime);

    // Assert
    expect(result.viewEntries.length).toBe(1);

    // Large task should be placed after the block since it doesn't fit before
    const taskLarge = result.viewEntries.find((r) => r.id === 'task-large');
    expect(taskLarge).toBeDefined();
    expect(taskLarge!.start).toBe(new Date('2025-11-04T10:00:00').getTime());
  });

  it('should use true best-fit algorithm to minimize fragmentation', () => {
    // Arrange
    const startTime = new Date('2025-11-04T08:00:00').getTime();
    const endTime = new Date('2025-11-04T17:00:00').getTime();

    const tasks: TaskWithoutReminder[] = [
      {
        id: 'task-50min',
        title: 'Task 50min',
        timeEstimate: 50 * 60 * 1000, // 50 minutes
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
      {
        id: 'task-30min',
        title: 'Task 30min',
        timeEstimate: 30 * 60 * 1000, // 30 minutes
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
    ];

    const blockedBlocks: BlockedBlock[] = [
      {
        start: new Date('2025-11-04T09:00:00').getTime(), // Gap 1: 60min (08:00-09:00)
        end: new Date('2025-11-04T10:00:00').getTime(),
        entries: [],
      },
      {
        start: new Date('2025-11-04T10:50:00').getTime(), // Gap 2: 50min (10:00-10:50)
        end: new Date('2025-11-04T11:00:00').getTime(),
        entries: [],
      },
    ];

    // Act
    const result = placeTasksInGaps(tasks, blockedBlocks, startTime, endTime);

    // Assert
    expect(result.viewEntries.length).toBe(2);

    // Best-fit should prioritize perfect fits
    // 50min task fits perfectly in 50min gap (0 waste)
    // 30min task fits in 60min gap (30min waste)
    const task50min = result.viewEntries.find((r) => r.id === 'task-50min');
    expect(task50min).toBeDefined();
    expect(task50min!.start).toBe(new Date('2025-11-04T10:00:00').getTime()); // Perfect fit in second gap

    const task30min = result.viewEntries.find((r) => r.id === 'task-30min');
    expect(task30min).toBeDefined();
    expect(task30min!.start).toBe(startTime); // Placed in first gap (08:00)
  });

  it('should flexibly place larger tasks first if it minimizes total waste', () => {
    // Arrange
    const startTime = new Date('2025-11-04T08:00:00').getTime();
    const endTime = new Date('2025-11-04T17:00:00').getTime();

    const tasks: TaskWithoutReminder[] = [
      {
        id: 'task-20min',
        title: 'Task 20min',
        timeEstimate: 20 * 60 * 1000, // 20 minutes (smallest)
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
      {
        id: 'task-90min',
        title: 'Task 90min',
        timeEstimate: 90 * 60 * 1000, // 90 minutes (largest)
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
      {
        id: 'task-30min',
        title: 'Task 30min',
        timeEstimate: 30 * 60 * 1000, // 30 minutes
        timeSpent: 0,
        timeSpentOnDay: {},
      } as TaskWithoutReminder,
    ];

    const blockedBlocks: BlockedBlock[] = [
      {
        start: new Date('2025-11-04T09:00:00').getTime(), // Gap 1: 60min (08:00-09:00)
        end: new Date('2025-11-04T10:00:00').getTime(),
        entries: [],
      },
      {
        start: new Date('2025-11-04T11:30:00').getTime(), // Gap 2: 90min (10:00-11:30)
        end: new Date('2025-11-04T12:00:00').getTime(),
        entries: [],
      },
    ];

    // Act
    const result = placeTasksInGaps(tasks, blockedBlocks, startTime, endTime);

    // Assert
    expect(result.viewEntries.length).toBe(3);

    // Optimal placement should be:
    // - 90min task in 90min gap (0 waste - perfect fit!)
    // - 30min task in 60min gap (30min waste)
    // - 20min task fills remaining 30min in 60min gap (0 waste - perfect fit!)
    // Total waste: 0min (perfect!)

    const task90min = result.viewEntries.find((r) => r.id === 'task-90min');
    expect(task90min).toBeDefined();
    expect(task90min!.start).toBe(new Date('2025-11-04T10:00:00').getTime()); // Perfect fit in 90min gap

    const task30min = result.viewEntries.find((r) => r.id === 'task-30min');
    expect(task30min).toBeDefined();
    expect(task30min!.start).toBe(startTime); // Placed in 60min gap first

    const task20min = result.viewEntries.find((r) => r.id === 'task-20min');
    expect(task20min).toBeDefined();
    const thirtyMinutesInMs = 30 * 60 * 1000;
    expect(task20min!.start).toBe(startTime + thirtyMinutesInMs); // Placed after 30min task
  });
});
