import { generateNotificationId } from './android-notification-id.util';

describe('generateNotificationId', () => {
  it('should generate the same ID for the same input', () => {
    const reminderId = 'test-reminder-id-123';
    const id1 = generateNotificationId(reminderId);
    const id2 = generateNotificationId(reminderId);

    expect(id1).toBe(id2);
  });

  it('should generate different IDs for different inputs', () => {
    const id1 = generateNotificationId('reminder-abc-123');
    const id2 = generateNotificationId('reminder-xyz-456');

    expect(id1).not.toBe(id2);
  });

  it('should always return a positive integer', () => {
    const testIds = [
      'short',
      'a-very-long-reminder-id-with-many-characters-123456789',
      'special-chars-!@#$%',
      'nanoid-V1StGXR8_Z5jdHi6B-myT',
    ];

    testIds.forEach((reminderId) => {
      const id = generateNotificationId(reminderId);
      expect(id).toBeGreaterThan(0);
      expect(Number.isInteger(id)).toBe(true);
    });
  });

  it('should return ID within safe Android range', () => {
    const testIds = [
      'test-1',
      'test-2',
      'very-long-id-that-might-cause-overflow-123456789',
    ];

    testIds.forEach((reminderId) => {
      const id = generateNotificationId(reminderId);
      expect(id).toBeLessThan(2147483647); // Max 32-bit signed integer
      expect(id).toBeGreaterThan(0);
    });
  });

  it('should throw error for invalid input', () => {
    expect(() => generateNotificationId('')).toThrow();
    expect(() => generateNotificationId(null as any)).toThrow();
    expect(() => generateNotificationId(undefined as any)).toThrow();
    expect(() => generateNotificationId(123 as any)).toThrow();
  });

  it('should handle typical nanoid format', () => {
    // Typical nanoid format used in the app
    const nanoidExamples = [
      'V1StGXR8_Z5jdHi6B-myT',
      'xQY6fK9kL3mN5pR2sT7vW',
      'aB1cD2eF3gH4iJ5kL6mN7',
    ];

    nanoidExamples.forEach((reminderId) => {
      const id = generateNotificationId(reminderId);
      expect(id).toBeGreaterThan(0);
      expect(Number.isInteger(id)).toBe(true);
    });
  });

  it('should be deterministic across multiple calls', () => {
    const reminderId = 'consistent-test-id';
    const ids = Array.from({ length: 100 }, () => generateNotificationId(reminderId));
    const firstId = ids[0];

    ids.forEach((id) => {
      expect(id).toBe(firstId);
    });
  });
});
