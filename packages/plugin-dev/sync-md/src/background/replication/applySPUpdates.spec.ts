import { applySPUpdates } from './applySPUpdates';
import { SPUpdate } from './types';

describe('applySPUpdates', () => {
  it('should separate create operations', () => {
    const updates: SPUpdate[] = [
      {
        type: 'create',
        task: {
          id: 'task-1',
          title: 'New Task 1',
          isDone: false,
          projectId: 'project-1',
        },
      },
      {
        type: 'create',
        task: {
          id: 'task-2',
          title: 'New Task 2',
          isDone: true,
          projectId: 'project-1',
        },
      },
    ];

    const result = applySPUpdates(updates);

    expect(result.creates).toHaveLength(2);
    expect(result.creates[0]).toEqual({
      id: 'task-1',
      title: 'New Task 1',
      isDone: false,
      projectId: 'project-1',
    });
    expect(result.creates[1]).toEqual({
      id: 'task-2',
      title: 'New Task 2',
      isDone: true,
      projectId: 'project-1',
    });
    expect(result.updates).toHaveLength(0);
    expect(result.deletes).toHaveLength(0);
  });

  it('should separate update operations', () => {
    const updates: SPUpdate[] = [
      {
        type: 'update',
        id: 'task-1',
        task: {
          title: 'Updated Title',
          isDone: true,
        },
      },
      {
        type: 'update',
        id: 'task-2',
        task: {
          isDone: false,
        },
      },
    ];

    const result = applySPUpdates(updates);

    expect(result.updates).toHaveLength(2);
    expect(result.updates[0]).toEqual({
      id: 'task-1',
      changes: {
        title: 'Updated Title',
        isDone: true,
      },
    });
    expect(result.updates[1]).toEqual({
      id: 'task-2',
      changes: {
        isDone: false,
      },
    });
    expect(result.creates).toHaveLength(0);
    expect(result.deletes).toHaveLength(0);
  });

  it('should separate delete operations', () => {
    const updates: SPUpdate[] = [
      {
        type: 'delete',
        id: 'task-1',
      },
      {
        type: 'delete',
        id: 'task-2',
      },
      {
        type: 'delete',
        id: 'task-3',
      },
    ];

    const result = applySPUpdates(updates);

    expect(result.deletes).toHaveLength(3);
    expect(result.deletes).toEqual(['task-1', 'task-2', 'task-3']);
    expect(result.creates).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
  });

  it('should handle mixed operations', () => {
    const updates: SPUpdate[] = [
      {
        type: 'create',
        task: {
          id: 'new-task',
          title: 'New Task',
          isDone: false,
          projectId: 'project-1',
        },
      },
      {
        type: 'update',
        id: 'existing-task',
        task: {
          title: 'Updated',
        },
      },
      {
        type: 'delete',
        id: 'old-task',
      },
    ];

    const result = applySPUpdates(updates);

    expect(result.creates).toHaveLength(1);
    expect(result.updates).toHaveLength(1);
    expect(result.deletes).toHaveLength(1);
    expect(result.creates[0].id).toBe('new-task');
    expect(result.updates[0].id).toBe('existing-task');
    expect(result.deletes[0]).toBe('old-task');
  });

  it('should handle empty updates array', () => {
    const updates: SPUpdate[] = [];

    const result = applySPUpdates(updates);

    expect(result.creates).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
    expect(result.deletes).toHaveLength(0);
  });

  it('should skip invalid operations', () => {
    const updates: SPUpdate[] = [
      {
        type: 'create',
        // Missing task
      },
      {
        type: 'update',
        id: 'task-1',
        // Missing task changes
      },
      {
        type: 'update',
        // Missing id
        task: { title: 'No ID' },
      },
      {
        type: 'delete',
        // Missing id
      },
    ];

    const result = applySPUpdates(updates);

    // All invalid operations should be skipped
    expect(result.creates).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
    expect(result.deletes).toHaveLength(0);
  });
});
