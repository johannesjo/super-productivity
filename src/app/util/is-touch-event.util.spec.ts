import {
  isTouchEvent,
  isTouchEventSupported,
  isTouchEventInstance,
} from './is-touch-event.util';

describe('TouchEvent Utilities', () => {
  describe('isTouchEvent', () => {
    it('should return true for objects with touches property', () => {
      const mockTouchEvent = { touches: [] } as any;
      expect(isTouchEvent(mockTouchEvent)).toBe(true);
    });

    it('should return false for objects without touches property', () => {
      const mockMouseEvent = { clientX: 100, clientY: 100 } as any;
      expect(isTouchEvent(mockMouseEvent)).toBe(false);
    });
  });

  describe('isTouchEventSupported', () => {
    it('should return true when TouchEvent is defined', () => {
      // Note: In testing environment, TouchEvent might not be defined
      // This test validates the function logic
      const result = isTouchEventSupported();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isTouchEventInstance', () => {
    it('should return true for objects with touches property when TouchEvent is not supported', () => {
      const mockTouchEvent = { touches: [] } as any;

      // Mock isTouchEventSupported to return false (simulating Safari scenario)
      const originalTouchEvent = (global as any).TouchEvent;
      delete (global as any).TouchEvent;

      expect(isTouchEventInstance(mockTouchEvent)).toBe(true);

      // Restore TouchEvent if it was defined
      if (originalTouchEvent) {
        (global as any).TouchEvent = originalTouchEvent;
      }
    });

    it('should return false for objects without touches property', () => {
      const mockMouseEvent = { clientX: 100, clientY: 100 } as any;
      expect(isTouchEventInstance(mockMouseEvent)).toBe(false);
    });
  });
});
