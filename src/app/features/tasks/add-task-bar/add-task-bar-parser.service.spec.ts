import { TestBed } from '@angular/core/testing';
import { AddTaskBarParserService } from './add-task-bar-parser.service';
import { AddTaskBarStateService } from './add-task-bar-state.service';

describe('AddTaskBarParserService', () => {
  let service: AddTaskBarParserService;
  let mockStateService: jasmine.SpyObj<AddTaskBarStateService>;

  beforeEach(() => {
    const mockStateServiceSpy = jasmine.createSpyObj('AddTaskBarStateService', [
      'updateCleanText',
      'setAutoDetectedProject',
      'updateProject',
      'updateTags',
      'updateNewTagTitles',
      'updateEstimate',
      'updateDate',
      'isAutoDetected',
    ]);

    mockStateServiceSpy.isAutoDetected.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        AddTaskBarParserService,
        { provide: AddTaskBarStateService, useValue: mockStateServiceSpy },
      ],
    });

    service = TestBed.inject(AddTaskBarParserService);
    mockStateService = TestBed.inject(
      AddTaskBarStateService,
    ) as jasmine.SpyObj<AddTaskBarStateService>;
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('parseAndUpdateText', () => {
    it('should handle empty text', () => {
      service.parseAndUpdateText('', null, [], [], null as any);
      expect(mockStateService.updateCleanText).not.toHaveBeenCalled();
    });

    it('should handle null config', () => {
      service.parseAndUpdateText('test task', null, [], [], null as any);
      expect(mockStateService.updateCleanText).not.toHaveBeenCalled();
    });
  });

  describe('resetPreviousResult', () => {
    it('should reset previous result without error', () => {
      expect(() => service.resetPreviousResult()).not.toThrow();
    });
  });

  describe('removeShortSyntaxFromInput', () => {
    it('should return same input for empty string', () => {
      expect(service.removeShortSyntaxFromInput('', 'tags')).toBe('');
    });

    describe('tags removal', () => {
      it('should remove specific tag', () => {
        const input = 'Task #important #urgent';
        const result = service.removeShortSyntaxFromInput(input, 'tags', 'important');
        expect(result).toBe('Task #urgent');
      });

      it('should remove all tags when no specific tag provided', () => {
        const input = 'Task #important #urgent #todo';
        const result = service.removeShortSyntaxFromInput(input, 'tags');
        expect(result).toBe('Task');
      });

      it('should handle tag removal case insensitively', () => {
        const input = 'Task #Important #URGENT';
        const result = service.removeShortSyntaxFromInput(input, 'tags', 'important');
        expect(result).toBe('Task #URGENT');
      });

      it('should handle tags at the beginning of input', () => {
        const input = '#urgent Task content';
        const result = service.removeShortSyntaxFromInput(input, 'tags', 'urgent');
        expect(result).toBe('Task content');
      });

      it('should handle tags at the end of input', () => {
        const input = 'Task content #urgent';
        const result = service.removeShortSyntaxFromInput(input, 'tags', 'urgent');
        expect(result).toBe('Task content');
      });
    });

    describe('date removal', () => {
      it('should remove date syntax', () => {
        const input = 'Task @today @16:30 @2024-01-15';
        const result = service.removeShortSyntaxFromInput(input, 'date');
        expect(result).toBe('Task');
      });

      it('should handle complex date formats', () => {
        const input = 'Meeting @tomorrow @next-week @2024-12-25';
        const result = service.removeShortSyntaxFromInput(input, 'date');
        expect(result).toBe('Meeting');
      });

      it('should handle date at beginning', () => {
        const input = '@today Task content';
        const result = service.removeShortSyntaxFromInput(input, 'date');
        expect(result).toBe('Task content');
      });

      it('should handle date at end', () => {
        const input = 'Task content @today';
        const result = service.removeShortSyntaxFromInput(input, 'date');
        expect(result).toBe('Task content');
      });
    });

    describe('estimate removal', () => {
      it('should remove various time estimate formats', () => {
        const testCases = [
          { input: 'Task t30m', expected: 'Task' },
          { input: 'Task 1h', expected: 'Task' },
          { input: 'Task 30m/1h', expected: 'Task' },
          { input: 'Task t1.5h', expected: 'Task' },
          { input: 'Task 45d', expected: 'Task' },
          { input: 'Task t30m other text', expected: 'Task other text' },
        ];

        testCases.forEach(({ input, expected }) => {
          const result = service.removeShortSyntaxFromInput(input, 'estimate');
          expect(result).toBe(expected);
        });
      });

      it('should handle multiple time estimates', () => {
        const input = 'Task t30m another t1h final';
        const result = service.removeShortSyntaxFromInput(input, 'estimate');
        expect(result).toBe('Task another final');
      });

      it('should handle time estimate at beginning', () => {
        const input = 't30m Task content';
        const result = service.removeShortSyntaxFromInput(input, 'estimate');
        expect(result).toBe('Task content');
      });

      it('should handle time estimate at end', () => {
        const input = 'Task content t30m';
        const result = service.removeShortSyntaxFromInput(input, 'estimate');
        expect(result).toBe('Task content');
      });

      it('should handle decimal hours', () => {
        const input = 'Task t2.5h content';
        const result = service.removeShortSyntaxFromInput(input, 'estimate');
        expect(result).toBe('Task content');
      });

      it('should handle days format', () => {
        const input = 'Task 3d content';
        const result = service.removeShortSyntaxFromInput(input, 'estimate');
        expect(result).toBe('Task content');
      });
    });

    it('should clean up extra whitespace', () => {
      const input = 'Task   #tag   @today   t30m   end';
      const result = service.removeShortSyntaxFromInput(input, 'tags');
      expect(result).toBe('Task @today t30m end');
    });

    it('should trim final result', () => {
      const input = '  #tag Task #another  ';
      const result = service.removeShortSyntaxFromInput(input, 'tags');
      expect(result).toBe('Task');
    });

    it('should handle mixed removal scenarios', () => {
      // Remove all tags and clean up spacing
      const input = 'Task #urgent #important content #todo';
      const result = service.removeShortSyntaxFromInput(input, 'tags');
      expect(result).toBe('Task content');
    });

    it('should handle empty input after removal', () => {
      const input = '#tag1 #tag2';
      const result = service.removeShortSyntaxFromInput(input, 'tags');
      expect(result).toBe('');
    });

    it('should handle whitespace-only input after removal', () => {
      const input = '  #tag1   #tag2  ';
      const result = service.removeShortSyntaxFromInput(input, 'tags');
      expect(result).toBe('');
    });
  });

  describe('private helper methods', () => {
    // Access private methods for testing
    let serviceAny: any;

    beforeEach(() => {
      serviceAny = service as any;
    });

    describe('_arraysEqual', () => {
      it('should return true for equal arrays', () => {
        expect(serviceAny._arraysEqual(['a', 'b'], ['a', 'b'])).toBe(true);
        expect(serviceAny._arraysEqual([], [])).toBe(true);
        expect(serviceAny._arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      });

      it('should return false for different arrays', () => {
        expect(serviceAny._arraysEqual(['a', 'b'], ['a', 'c'])).toBe(false);
        expect(serviceAny._arraysEqual(['a'], ['a', 'b'])).toBe(false);
        expect(serviceAny._arraysEqual([1, 2], [2, 1])).toBe(false);
        expect(serviceAny._arraysEqual([1, 2], [])).toBe(false);
        expect(serviceAny._arraysEqual([], [1])).toBe(false);
      });

      it('should handle null and undefined values', () => {
        expect(serviceAny._arraysEqual([null], [null])).toBe(true);
        expect(serviceAny._arraysEqual([undefined], [undefined])).toBe(true);
        expect(serviceAny._arraysEqual([null], [undefined])).toBe(false);
      });
    });

    describe('_datesEqual', () => {
      it('should return true for equal dates', () => {
        const date1 = new Date('2024-01-15T10:30:00Z');
        const date2 = new Date('2024-01-15T10:30:00Z');
        expect(serviceAny._datesEqual(date1, date2)).toBe(true);
        expect(serviceAny._datesEqual(null, null)).toBe(true);
      });

      it('should return false for different dates', () => {
        const date1 = new Date('2024-01-15T10:30:00Z');
        const date2 = new Date('2024-01-16T10:30:00Z');
        expect(serviceAny._datesEqual(date1, date2)).toBe(false);
        expect(serviceAny._datesEqual(date1, null)).toBe(false);
        expect(serviceAny._datesEqual(null, date1)).toBe(false);
      });

      it('should handle same timestamp different date objects', () => {
        const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
        const date1 = new Date(timestamp);
        const date2 = new Date(timestamp);
        expect(serviceAny._datesEqual(date1, date2)).toBe(true);
      });

      it('should handle millisecond differences', () => {
        const date1 = new Date('2024-01-15T10:30:00.000Z');
        const date2 = new Date('2024-01-15T10:30:00.001Z');
        expect(serviceAny._datesEqual(date1, date2)).toBe(false);
      });
    });
  });
});
