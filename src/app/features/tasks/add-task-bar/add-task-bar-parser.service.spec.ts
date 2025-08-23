import { TestBed } from '@angular/core/testing';
import { AddTaskBarParserService } from './add-task-bar-parser.service';
import { AddTaskBarStateService } from './add-task-bar-state.service';
import { ShortSyntaxConfig } from '../../config/global-config.model';
import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';

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
    let mockConfig: ShortSyntaxConfig;
    let mockProjects: Project[];
    let mockTags: Tag[];
    let mockDefaultProject: Project;

    beforeEach(() => {
      mockConfig = {
        isEnableProject: true,
        isEnableDue: true,
        isEnableTag: true,
      } as ShortSyntaxConfig;

      mockDefaultProject = {
        id: 'default-project',
        title: 'Default Project',
        icon: 'folder',
      } as Project;

      mockProjects = [
        mockDefaultProject,
        { id: 'proj-1', title: 'Project One' } as Project,
        { id: 'proj-2', title: 'Project Two' } as Project,
      ];

      mockTags = [
        { id: 'tag-1', title: 'urgent' } as Tag,
        { id: 'tag-2', title: 'important' } as Tag,
      ];

      // Reset all spy calls before each test
      mockStateService.updateCleanText.calls.reset();
      mockStateService.updateDate.calls.reset();
      mockStateService.updateEstimate.calls.reset();
      mockStateService.updateTags.calls.reset();
      mockStateService.updateNewTagTitles.calls.reset();
      mockStateService.setAutoDetectedProject.calls.reset();
      mockStateService.updateProject.calls.reset();
    });

    it('should handle empty text', () => {
      service.parseAndUpdateText('', null, [], [], null as any);
      expect(mockStateService.updateCleanText).not.toHaveBeenCalled();
    });

    it('should handle null config', () => {
      service.parseAndUpdateText('test task', null, [], [], null as any);
      expect(mockStateService.updateCleanText).not.toHaveBeenCalled();
    });

    describe('Date Parsing', () => {
      it('should handle default date when no date syntax present', () => {
        const defaultDate = '2024-01-15';
        const defaultTime = '09:00';

        service.parseAndUpdateText(
          'Simple task',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
          defaultDate,
          defaultTime,
        );

        expect(mockStateService.updateDate).toHaveBeenCalled();
        const [date, time] = mockStateService.updateDate.calls.mostRecent().args;
        expect(date).toBeInstanceOf(Date);
        expect(date?.toISOString().split('T')[0]).toBe(defaultDate);
        expect(time).toBe(defaultTime);
      });

      it('should handle no date or default date', () => {
        service.parseAndUpdateText(
          'Simple task',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        expect(mockStateService.updateDate).toHaveBeenCalled();
        const [date, time] = mockStateService.updateDate.calls.mostRecent().args;
        expect(date).toBeNull();
        expect(time).toBeNull();
      });

      it('should test date parsing integration with shortSyntax', () => {
        // Since shortSyntax is complex and depends on external implementation,
        // we'll test the parser's handling of the parsed results
        service.parseAndUpdateText(
          'Task with date syntax that may or may not be parsed',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        expect(mockStateService.updateDate).toHaveBeenCalled();
        expect(mockStateService.updateCleanText).toHaveBeenCalled();
      });

      it('should handle default date and time when no syntax is found', () => {
        const defaultDate = '2024-01-15';
        const defaultTime = '09:00';

        service.parseAndUpdateText(
          'Plain text task',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
          defaultDate,
          defaultTime,
        );

        expect(mockStateService.updateDate).toHaveBeenCalled();
        const [date, time] = mockStateService.updateDate.calls.mostRecent().args;
        expect(date).toBeInstanceOf(Date);
        expect(time).toBe(defaultTime);
      });
    });

    describe('Parsing Integration', () => {
      it('should call updateEstimate when parsing text', () => {
        service.parseAndUpdateText(
          'Task with potential time estimate',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        expect(mockStateService.updateEstimate).toHaveBeenCalled();
      });

      it('should handle null time estimates', () => {
        service.parseAndUpdateText(
          'Simple task',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        expect(mockStateService.updateEstimate).toHaveBeenCalledWith(null);
      });
    });

    describe('Basic Parsing Tests', () => {
      it('should update tags when parsing text', () => {
        service.parseAndUpdateText(
          'Task with tags',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        expect(mockStateService.updateTags).toHaveBeenCalled();
        expect(mockStateService.updateNewTagTitles).toHaveBeenCalled();
      });

      it('should handle auto-detected projects', () => {
        mockStateService.isAutoDetected.and.returnValue(false);

        service.parseAndUpdateText(
          'Simple task',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        // Should call update methods
        expect(mockStateService.updateCleanText).toHaveBeenCalled();
        expect(mockStateService.updateDate).toHaveBeenCalled();
      });

      it('should handle text with clean text update', () => {
        service.parseAndUpdateText(
          'Task text',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        expect(mockStateService.updateCleanText).toHaveBeenCalledWith('Task text');
      });

      it('should handle edge cases gracefully', () => {
        const longText = 'Task ' + 'a'.repeat(1000);

        expect(() => {
          service.parseAndUpdateText(
            longText,
            mockConfig,
            mockProjects,
            mockTags,
            mockDefaultProject,
          );
        }).not.toThrow();
      });

      it('should handle empty arrays for projects and tags', () => {
        service.parseAndUpdateText(
          'Task with no matching items',
          mockConfig,
          [],
          [],
          mockDefaultProject,
        );

        expect(mockStateService.updateTags).toHaveBeenCalled();
        expect(mockStateService.updateNewTagTitles).toHaveBeenCalled();
      });

      it('should handle special characters in task text', () => {
        service.parseAndUpdateText(
          'Task with special chars !@#$%^&*()',
          mockConfig,
          mockProjects,
          mockTags,
          mockDefaultProject,
        );

        expect(mockStateService.updateCleanText).toHaveBeenCalled();
      });
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
