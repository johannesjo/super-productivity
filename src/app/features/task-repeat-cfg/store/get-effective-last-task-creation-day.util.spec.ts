import { getEffectiveLastTaskCreationDay } from './get-effective-last-task-creation-day.util';
import { TaskRepeatCfg } from '../task-repeat-cfg.model';

describe('getEffectiveLastTaskCreationDay', () => {
  it('should return lastTaskCreationDay when available', () => {
    const cfg = {
      lastTaskCreationDay: '2025-08-01',
      lastTaskCreation: new Date('2025-07-15').getTime(),
    } as TaskRepeatCfg;

    const result = getEffectiveLastTaskCreationDay(cfg);
    expect(result).toBe('2025-08-01');
  });

  it('should fall back to lastTaskCreation when lastTaskCreationDay is not available', () => {
    const cfg = {
      lastTaskCreation: new Date('2025-07-15T10:30:00').getTime(),
    } as TaskRepeatCfg;

    const result = getEffectiveLastTaskCreationDay(cfg);
    expect(result).toBe('2025-07-15');
  });

  it('should return undefined when neither field is available', () => {
    const cfg = {} as TaskRepeatCfg;

    const result = getEffectiveLastTaskCreationDay(cfg);
    expect(result).toBeUndefined();
  });

  it('should prefer lastTaskCreationDay over lastTaskCreation', () => {
    const cfg = {
      lastTaskCreationDay: '2025-08-01',
      lastTaskCreation: new Date('2025-07-15').getTime(),
    } as TaskRepeatCfg;

    const result = getEffectiveLastTaskCreationDay(cfg);
    expect(result).toBe('2025-08-01');
  });

  it('should handle midnight timestamps correctly', () => {
    const cfg = {
      lastTaskCreation: new Date('2025-12-31T00:00:00').getTime(),
    } as TaskRepeatCfg;

    const result = getEffectiveLastTaskCreationDay(cfg);
    expect(result).toBe('2025-12-31');
  });

  it('should handle late night timestamps correctly', () => {
    const cfg = {
      lastTaskCreation: new Date('2025-12-31T23:59:59').getTime(),
    } as TaskRepeatCfg;

    const result = getEffectiveLastTaskCreationDay(cfg);
    expect(result).toBe('2025-12-31');
  });
});
