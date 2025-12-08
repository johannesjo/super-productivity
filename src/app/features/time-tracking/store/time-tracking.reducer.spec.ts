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
  });
});
