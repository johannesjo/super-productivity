import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ActionCreateTask,
  ActionAddTag,
  ActionDisplaySnack,
  ActionDisplayDialog,
  ActionWebhook,
} from './actions';
import { AutomationContext } from './definitions';
import { TaskEvent } from '../types';
import { PluginAPI } from '@super-productivity/plugin-api';
import { DataCache } from './data-cache';

describe('Actions', () => {
  let mockPlugin: PluginAPI;
  let mockContext: AutomationContext;
  let mockDataCache: DataCache;

  beforeEach(() => {
    mockPlugin = {
      addTask: vi.fn(),
      updateTask: vi.fn(),
      getAllTags: vi.fn(),
      showSnack: vi.fn(),
      openDialog: vi.fn(),
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    } as unknown as PluginAPI;

    mockDataCache = {
      getProjects: vi.fn(),
      getTags: vi.fn(),
    } as unknown as DataCache;

    mockContext = { plugin: mockPlugin, dataCache: mockDataCache };
  });

  describe('ActionCreateTask', () => {
    it('should create a task with the provided title', async () => {
      const event = { task: { projectId: 'p1' } } as TaskEvent;
      await ActionCreateTask.execute(mockContext, event, 'New Task');
      expect(mockPlugin.addTask).toHaveBeenCalledWith({
        title: 'New Task',
        projectId: 'p1',
      });
    });

    it('should not create task if value is empty', async () => {
      const event = {} as TaskEvent;
      await ActionCreateTask.execute(mockContext, event, '');
      expect(mockPlugin.addTask).not.toHaveBeenCalled();
    });
  });

  describe('ActionAddTag', () => {
    it('should add a tag if it exists and is not already present', async () => {
      (mockDataCache.getTags as any).mockResolvedValue([{ id: 't1', title: 'Urgent' }]);
      const event = {
        task: { id: 'task1', tagIds: [] },
      } as unknown as TaskEvent;

      await ActionAddTag.execute(mockContext, event, 'Urgent');

      expect(mockPlugin.updateTask).toHaveBeenCalledWith('task1', {
        tagIds: ['t1'],
      });
    });

    it('should warn if task is missing', async () => {
      await ActionAddTag.execute(mockContext, { task: undefined } as TaskEvent, 'Urgent');
      expect(mockPlugin.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('without task context'),
      );
      expect(mockPlugin.updateTask).not.toHaveBeenCalled();
    });

    it('should warn if tag not found', async () => {
      (mockDataCache.getTags as any).mockResolvedValue([]);
      const event = {
        task: { id: 'task1', tagIds: [] },
      } as unknown as TaskEvent;

      await ActionAddTag.execute(mockContext, event, 'NonExistent');
      expect(mockPlugin.log.warn).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(mockPlugin.updateTask).not.toHaveBeenCalled();
    });

    it('should do nothing if tag already present', async () => {
      (mockDataCache.getTags as any).mockResolvedValue([{ id: 't1', title: 'Urgent' }]);
      const event = {
        task: { id: 'task1', tagIds: ['t1'] },
      } as unknown as TaskEvent;

      await ActionAddTag.execute(mockContext, event, 'Urgent');
      expect(mockPlugin.updateTask).not.toHaveBeenCalled();
    });
  });

  describe('ActionDisplaySnack', () => {
    it('should show snack', async () => {
      await ActionDisplaySnack.execute(mockContext, {} as TaskEvent, 'Hello');
      expect(mockPlugin.showSnack).toHaveBeenCalledWith({ msg: 'Hello', type: 'SUCCESS' });
    });
  });

  describe('ActionDisplayDialog', () => {
    it('should open dialog', async () => {
      await ActionDisplayDialog.execute(mockContext, {} as TaskEvent, 'Alert');
      expect(mockPlugin.openDialog).toHaveBeenCalledWith(
        expect.objectContaining({ htmlContent: '<p>Alert</p>' }),
      );
    });
  });

  describe('ActionWebhook', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should send POST request to webhook url', async () => {
      const event = { type: 'taskCompleted' } as TaskEvent;
      await ActionWebhook.execute(mockContext, event, 'http://example.com');
      expect(fetch).toHaveBeenCalledWith(
        'http://example.com',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(event),
        }),
      );
    });

    it('should log error on fetch failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network Error'));
      await ActionWebhook.execute(mockContext, {} as TaskEvent, 'http://example.com');
      expect(mockPlugin.log.error).toHaveBeenCalled();
    });
  });
});
