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
    expect(result.length).toBe(3);

    // Task A (30min) should fit in first gap (08:00-09:00, 60min available)
    const taskA = result.find((r) => r.id === 'task-a');
    expect(taskA).toBeDefined();
    expect(taskA!.start).toBe(startTime); // 08:00

    // Task B (45min) should fit in first gap after Task A
    const taskB = result.find((r) => r.id === 'task-b');
    expect(taskB).toBeDefined();
    const thirtyMinutesInMs = 30 * 60 * 1000;
    expect(taskB!.start).toBe(startTime + thirtyMinutesInMs); // 08:30

    // Task C (60min) should fit in second gap (10:00-13:00, 180min available)
    const taskC = result.find((r) => r.id === 'task-c');
    expect(taskC).toBeDefined();
    expect(taskC!.start).toBe(new Date('2025-11-04T10:00:00').getTime());
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
    expect(result.length).toBe(1);

    // Large task should be placed after the block since it doesn't fit before
    const taskLarge = result.find((r) => r.id === 'task-large');
    expect(taskLarge).toBeDefined();
    expect(taskLarge!.start).toBe(new Date('2025-11-04T10:00:00').getTime());
  });
});
