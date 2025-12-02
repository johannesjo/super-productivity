import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConditionEvaluator } from './condition-evaluator';
import { PluginAPI } from '@super-productivity/plugin-api';
import { AutomationRegistry } from './registry';
import { Condition, TaskEvent } from '../types';
import { DataCache } from './data-cache';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;
  let mockPlugin: PluginAPI;
  let mockRegistry: AutomationRegistry;
  let mockDataCache: DataCache;

  beforeEach(() => {
    mockPlugin = {} as PluginAPI;
    mockRegistry = {
      getCondition: vi.fn(),
    } as unknown as AutomationRegistry;
    mockDataCache = {} as DataCache;

    evaluator = new ConditionEvaluator(mockPlugin, mockRegistry, mockDataCache);
  });

  it('should return true if there are no conditions', async () => {
    const result = await evaluator.allConditionsMatch([], {} as TaskEvent);
    expect(result).toBe(true);
  });

  it('should return true if all conditions match', async () => {
    const mockConditionImpl = {
      check: vi.fn().mockResolvedValue(true),
    };
    (mockRegistry.getCondition as any).mockReturnValue(mockConditionImpl);

    const conditions: Condition[] = [
      { type: 'titleContains', value: 'test' },
      { type: 'projectIs', value: 'p1' },
    ];

    const result = await evaluator.allConditionsMatch(conditions, {} as TaskEvent);
    expect(result).toBe(true);
    expect(mockConditionImpl.check).toHaveBeenCalledTimes(2);
  });

  it('should return false if any condition fails', async () => {
    const mockConditionImpl = {
      check: vi.fn().mockResolvedValue(false), // Fails
    };
    (mockRegistry.getCondition as any).mockReturnValue(mockConditionImpl);

    const conditions: Condition[] = [{ type: 'titleContains', value: 'test' }];

    const result = await evaluator.allConditionsMatch(conditions, {} as TaskEvent);
    expect(result).toBe(false);
  });

  it('should return false if condition implementation is not found', async () => {
    (mockRegistry.getCondition as any).mockReturnValue(undefined);

    const conditions: Condition[] = [{ type: 'unknownCondition' as any, value: 'test' }];

    const result = await evaluator.allConditionsMatch(conditions, {} as TaskEvent);
    expect(result).toBe(false);
  });

  it('should stop evaluating after first failure', async () => {
    const mockConditionImpl = {
      check: vi
        .fn()
        .mockResolvedValueOnce(false) // First fails
        .mockResolvedValueOnce(true), // Second would pass
    };
    (mockRegistry.getCondition as any).mockReturnValue(mockConditionImpl);

    const conditions: Condition[] = [
      { type: 'c1' as any, value: 'v1' },
      { type: 'c2' as any, value: 'v2' },
    ];

    const result = await evaluator.allConditionsMatch(conditions, {} as TaskEvent);
    expect(result).toBe(false);
    expect(mockConditionImpl.check).toHaveBeenCalledTimes(1);
  });
});
