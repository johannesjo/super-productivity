import { TestBed } from '@angular/core/testing';
import { AndroidEffects, buildTaskTitle } from './android.effects';
import { SnackService } from '../../../core/snack/snack.service';
import { TaskService } from '../../tasks/task.service';
import { TaskAttachmentService } from '../../tasks/task-attachment/task-attachment.service';
import { AndroidCaptureImportService } from '../android-capture-import.service';

describe('android share helpers', () => {
  describe('buildTaskTitle', () => {
    it('prefers the subject (page title from browsers) over everything else', () => {
      expect(
        buildTaskTitle({
          subject: 'Great Article',
          title: 'Some Title',
          type: 'LINK',
          path: 'https://example.com/post',
        }),
      ).toBe('Great Article');
    });

    it('falls back to the explicit title when there is no subject', () => {
      expect(
        buildTaskTitle({
          subject: '',
          title: 'Some Title',
          type: 'LINK',
          path: 'https://example.com/post',
        }),
      ).toBe('Some Title');
    });

    // Regression: a share without subject/title must derive a readable title
    // from the link, not the generic "Shared Content" placeholder.
    it('derives a readable title from the URL for links without subject/title', () => {
      expect(
        buildTaskTitle({
          subject: '',
          title: '',
          type: 'LINK',
          path: 'https://www.example.com/some-cool-article',
        }),
      ).toBe('example.com: some cool article');
    });

    it('uses the first line of content for notes without subject/title', () => {
      expect(
        buildTaskTitle({
          subject: '',
          title: '',
          type: 'NOTE',
          path: 'Buy milk\nand bread',
        }),
      ).toBe('Buy milk');
    });

    it('falls back to "Shared note" for empty note content', () => {
      expect(buildTaskTitle({ subject: '', title: '', type: 'NOTE', path: '' })).toBe(
        'Shared note',
      );
    });

    it('tolerates missing fields', () => {
      expect(buildTaskTitle({})).toBe('Shared note');
    });

    it('truncates very long titles to 150 chars', () => {
      const result = buildTaskTitle({
        subject: 'x'.repeat(300),
        type: 'NOTE',
        path: 'p',
      });
      expect(result.length).toBe(150);
      expect(result.endsWith('...')).toBeTrue();
    });
  });

  describe('createTaskFromShare', () => {
    let effects: AndroidEffects;
    let taskService: jasmine.SpyObj<TaskService>;
    let attachmentService: jasmine.SpyObj<TaskAttachmentService>;

    beforeEach(() => {
      taskService = jasmine.createSpyObj('TaskService', ['add']);
      taskService.add.and.returnValue('task-1');
      attachmentService = jasmine.createSpyObj('TaskAttachmentService', [
        'addAttachment',
      ]);
      TestBed.configureTestingModule({
        providers: [
          AndroidEffects,
          { provide: TaskService, useValue: taskService },
          { provide: TaskAttachmentService, useValue: attachmentService },
          {
            provide: SnackService,
            useValue: jasmine.createSpyObj('SnackService', ['open']),
          },
          { provide: AndroidCaptureImportService, useValue: {} },
        ],
      });
      effects = TestBed.inject(AndroidEffects);
    });

    it('stores a shared title literally instead of parsing short syntax', () => {
      effects.createTaskFromShare({
        subject: 'C# #tips @ 5pm +Work',
        title: '',
        type: 'LINK',
        path: 'https://example.com/post',
      });

      expect(taskService.add).toHaveBeenCalledOnceWith(
        'C# #tips @ 5pm +Work',
        false,
        {},
        false,
        true,
      );
      expect(attachmentService.addAttachment).toHaveBeenCalledWith(
        'task-1',
        jasmine.objectContaining({ type: 'LINK', path: 'https://example.com/post' }),
      );
    });

    it('creates nothing for an empty share', () => {
      effects.createTaskFromShare({ subject: '', title: '', type: 'NOTE', path: '  ' });

      expect(taskService.add).not.toHaveBeenCalled();
      expect(attachmentService.addAttachment).not.toHaveBeenCalled();
    });
  });
});
