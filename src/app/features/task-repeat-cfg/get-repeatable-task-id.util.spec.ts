import { getRepeatableTaskId } from './get-repeatable-task-id.util';

describe('getRepeatableTaskId', () => {
  it('should generate deterministic ID from repeatCfgId and dueDay', () => {
    const id1 = getRepeatableTaskId('abc123', '2025-01-15');
    const id2 = getRepeatableTaskId('abc123', '2025-01-15');
    expect(id1).toBe(id2);
  });

  it('should generate different IDs for different dueDays', () => {
    const id1 = getRepeatableTaskId('abc123', '2025-01-15');
    const id2 = getRepeatableTaskId('abc123', '2025-01-16');
    expect(id1).not.toBe(id2);
  });

  it('should generate different IDs for different repeatCfgIds', () => {
    const id1 = getRepeatableTaskId('abc123', '2025-01-15');
    const id2 = getRepeatableTaskId('xyz789', '2025-01-15');
    expect(id1).not.toBe(id2);
  });

  it('should have the expected format with rpt_ prefix', () => {
    const id = getRepeatableTaskId('myConfigId', '2025-12-31');
    expect(id).toBe('rpt_myConfigId_2025-12-31');
  });

  it('should handle long repeatCfgIds', () => {
    const longId = 'a'.repeat(100);
    const id = getRepeatableTaskId(longId, '2025-01-01');
    expect(id).toBe(`rpt_${longId}_2025-01-01`);
  });
});
