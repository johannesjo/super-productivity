/* eslint-disable @typescript-eslint/naming-convention */
import { initialTimeTrackingState, timeTrackingReducer } from './time-tracking.reducer';
import {
  TimeTrackingActions,
  updateWorkContextData,
  syncTimeTracking,
} from './time-tracking.actions';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AppDataCompleteNew } from '../../../pfapi/pfapi-config';
import { TaskCopy } from '../../tasks/task.model';
import { WorkContextType } from '../../work-context/work-context.model';

describe('TimeTracking Reducer', () => {
  it('should return the previous state for an unknown action', () => {
    const action = {} as any;
    const result = timeTrackingReducer(initialTimeTrackingState, action);
    expect(result).toBe(initialTimeTrackingState);
  });

  it('should load all data', () => {
    const appDataComplete: AppDataCompleteNew = {
      timeTracking: {
        project: { '1': { '2023-01-01': { s: 1, e: 2, b: 3, bt: 4 } } },
        tag: { '2': { '2023-01-02': { s: 5, e: 6, b: 7, bt: 8 } } },
      },
    } as Partial<AppDataCompleteNew> as AppDataCompleteNew;
    const action = loadAllData({ appDataComplete });
    const result = timeTrackingReducer(initialTimeTrackingState, action);
    expect(result).toEqual(appDataComplete.timeTracking);
  });

  it('should update the whole state', () => {
    const newState = {
      project: { '1': { '2023-01-01': { s: 1, e: 2, b: 3, bt: 4 } } },
      tag: { '2': { '2023-01-02': { s: 5, e: 6, b: 7, bt: 8 } } },
    };
    const action = TimeTrackingActions.updateWholeState({ newState });
    const result = timeTrackingReducer(initialTimeTrackingState, action);
    expect(result).toEqual(newState);
  });

  it('should add time spent', () => {
    const task = { projectId: '1', tagIds: ['2'] } as Partial<TaskCopy> as TaskCopy;
    const date = '2023-01-01';
    const action = TimeTrackingActions.addTimeSpent({
      task,
      date,
      duration: 223,
      isFromTrackingReminder: false,
    });
    const result = timeTrackingReducer(initialTimeTrackingState, action);
    expect(result.project['1'][date].s).toBeDefined();
    expect(result.project['1'][date].e).toBeDefined();
    expect(result.tag['2'][date].s).toBeDefined();
    expect(result.tag['2'][date].e).toBeDefined();
  });

  it('should update work context data', () => {
    // Set up a custom initial state with the required structure
    const customInitialState = {
      ...initialTimeTrackingState,
      project: { '1': { '2023-01-01': { s: 0, e: 0 } } },
    };

    const ctx = { id: '1', type: 'PROJECT' as WorkContextType };
    const date = '2023-01-01';
    const updates = { s: 10, e: 20 };
    const action = updateWorkContextData({ ctx, date, updates });
    const result = timeTrackingReducer(customInitialState, action);

    expect(result.project['1'][date].s).toBe(10);
    expect(result.project['1'][date].e).toBe(20);
  });

  it('should update work context data for a tag', () => {
    // Set up a custom initial state with the required structure
    const customInitialState = {
      ...initialTimeTrackingState,
      tag: { '2': { '2023-01-02': { s: 0, e: 0 } } },
    };

    const ctx = { id: '2', type: 'TAG' as WorkContextType };
    const date = '2023-01-02';
    const updates = { s: 30, e: 40 };
    const action = updateWorkContextData({ ctx, date, updates });
    const result = timeTrackingReducer(customInitialState, action);

    expect(result.tag['2'][date].s).toBe(30);
    expect(result.tag['2'][date].e).toBe(40);
  });

  describe('syncTimeTracking', () => {
    it('should sync time tracking data for a PROJECT context', () => {
      const action = syncTimeTracking({
        contextType: 'PROJECT',
        contextId: 'proj-1',
        date: '2024-01-15',
        data: { s: 1000, e: 2000, b: 1, bt: 100 },
      });
      const result = timeTrackingReducer(initialTimeTrackingState, action);

      expect(result.project['proj-1']['2024-01-15']).toEqual({
        s: 1000,
        e: 2000,
        b: 1,
        bt: 100,
      });
    });

    it('should sync time tracking data for a TAG context', () => {
      const action = syncTimeTracking({
        contextType: 'TAG',
        contextId: 'tag-1',
        date: '2024-01-15',
        data: { s: 3000, e: 4000 },
      });
      const result = timeTrackingReducer(initialTimeTrackingState, action);

      expect(result.tag['tag-1']['2024-01-15']).toEqual({ s: 3000, e: 4000 });
    });

    it('should replace existing data when syncing', () => {
      const customInitialState = {
        ...initialTimeTrackingState,
        tag: { 'tag-1': { '2024-01-15': { s: 100, e: 200 } } },
      };

      const action = syncTimeTracking({
        contextType: 'TAG',
        contextId: 'tag-1',
        date: '2024-01-15',
        data: { s: 5000, e: 6000, b: 2, bt: 300 },
      });
      const result = timeTrackingReducer(customInitialState, action);

      expect(result.tag['tag-1']['2024-01-15']).toEqual({
        s: 5000,
        e: 6000,
        b: 2,
        bt: 300,
      });
    });

    it('should preserve other dates when syncing', () => {
      const customInitialState = {
        ...initialTimeTrackingState,
        project: {
          'proj-1': {
            '2024-01-14': { s: 100, e: 200 },
            '2024-01-15': { s: 300, e: 400 },
          },
        },
      };

      const action = syncTimeTracking({
        contextType: 'PROJECT',
        contextId: 'proj-1',
        date: '2024-01-15',
        data: { s: 9000, e: 10000 },
      });
      const result = timeTrackingReducer(customInitialState, action);

      expect(result.project['proj-1']['2024-01-14']).toEqual({ s: 100, e: 200 });
      expect(result.project['proj-1']['2024-01-15']).toEqual({ s: 9000, e: 10000 });
    });

    it('should preserve other contexts when syncing', () => {
      // Ensure syncing one context does not affect other contexts
      const customInitialState = {
        ...initialTimeTrackingState,
        project: {
          'proj-1': { '2024-01-15': { s: 100, e: 200 } },
          'proj-2': { '2024-01-15': { s: 300, e: 400 } },
        },
        tag: {
          'tag-1': { '2024-01-15': { s: 500, e: 600 } },
        },
      };

      const action = syncTimeTracking({
        contextType: 'PROJECT',
        contextId: 'proj-1',
        date: '2024-01-15',
        data: { s: 9999, e: 9999 },
      });
      const result = timeTrackingReducer(customInitialState, action);

      // proj-1 should be updated
      expect(result.project['proj-1']['2024-01-15']).toEqual({ s: 9999, e: 9999 });
      // proj-2 should be unchanged
      expect(result.project['proj-2']['2024-01-15']).toEqual({ s: 300, e: 400 });
      // tag-1 should be unchanged
      expect(result.tag['tag-1']['2024-01-15']).toEqual({ s: 500, e: 600 });
    });

    it('should create new context if it does not exist', () => {
      const action = syncTimeTracking({
        contextType: 'PROJECT',
        contextId: 'new-proj',
        date: '2024-01-15',
        data: { s: 1000, e: 2000 },
      });
      const result = timeTrackingReducer(initialTimeTrackingState, action);

      expect(result.project['new-proj']).toBeDefined();
      expect(result.project['new-proj']['2024-01-15']).toEqual({ s: 1000, e: 2000 });
    });

    it('should create new date for existing context', () => {
      const customInitialState = {
        ...initialTimeTrackingState,
        project: {
          'proj-1': { '2024-01-14': { s: 100, e: 200 } },
        },
      };

      const action = syncTimeTracking({
        contextType: 'PROJECT',
        contextId: 'proj-1',
        date: '2024-01-16', // New date
        data: { s: 500, e: 600 },
      });
      const result = timeTrackingReducer(customInitialState, action);

      // Both dates should exist
      expect(result.project['proj-1']['2024-01-14']).toEqual({ s: 100, e: 200 });
      expect(result.project['proj-1']['2024-01-16']).toEqual({ s: 500, e: 600 });
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state when syncing', () => {
      const originalState = {
        ...initialTimeTrackingState,
        project: {
          'proj-1': { '2024-01-15': { s: 100, e: 200 } },
        },
      };
      const originalProjectData = originalState.project['proj-1']['2024-01-15'];

      const action = syncTimeTracking({
        contextType: 'PROJECT',
        contextId: 'proj-1',
        date: '2024-01-15',
        data: { s: 9999, e: 9999 },
      });
      const result = timeTrackingReducer(originalState, action);

      // Original should be unchanged
      expect(originalProjectData).toEqual({ s: 100, e: 200 });
      // Result should be different
      expect(result.project['proj-1']['2024-01-15']).toEqual({ s: 9999, e: 9999 });
      // Result should be a new object
      expect(result).not.toBe(originalState);
      expect(result.project).not.toBe(originalState.project);
    });

    it('should not mutate original state when updating work context data', () => {
      const originalState = {
        ...initialTimeTrackingState,
        tag: { 'tag-1': { '2024-01-15': { s: 100, e: 200 } } },
      };

      const action = updateWorkContextData({
        ctx: { id: 'tag-1', type: 'TAG' as WorkContextType },
        date: '2024-01-15',
        updates: { b: 5, bt: 50 },
      });
      const result = timeTrackingReducer(originalState, action);

      // Original should be unchanged
      expect(originalState.tag['tag-1']['2024-01-15']).toEqual({ s: 100, e: 200 });
      // Result should have merged values
      expect(result.tag['tag-1']['2024-01-15']).toEqual({ s: 100, e: 200, b: 5, bt: 50 });
    });
  });

  describe('updateWorkContextData deep structure', () => {
    it('should merge updates with existing data (not replace)', () => {
      const customInitialState = {
        ...initialTimeTrackingState,
        project: {
          'proj-1': { '2024-01-15': { s: 100, e: 200, b: 1 } },
        },
      };

      const action = updateWorkContextData({
        ctx: { id: 'proj-1', type: 'PROJECT' as WorkContextType },
        date: '2024-01-15',
        updates: { bt: 50 }, // Only updating bt
      });
      const result = timeTrackingReducer(customInitialState, action);

      // All fields should be present
      expect(result.project['proj-1']['2024-01-15']).toEqual({
        s: 100,
        e: 200,
        b: 1,
        bt: 50,
      });
    });

    it('should create context and date if they do not exist for updateWorkContextData', () => {
      const action = updateWorkContextData({
        ctx: { id: 'new-proj', type: 'PROJECT' as WorkContextType },
        date: '2024-01-20',
        updates: { s: 500 },
      });
      const result = timeTrackingReducer(initialTimeTrackingState, action);

      expect(result.project['new-proj']).toBeDefined();
      expect(result.project['new-proj']['2024-01-20']).toEqual({ s: 500 });
    });
  });
});
