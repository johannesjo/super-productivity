import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { TaskBuilderService } from './task-builder.service';
import { TaskService } from './task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { TagService } from '../tag/tag.service';
import { SnackService } from '../../core/snack/snack.service';
import { TaskCopy, TaskReminderOptionId } from './task.model';
import { DEFAULT_TASK_REPEAT_CFG } from '../task-repeat-cfg/task-repeat-cfg.model';
import type { AddTaskPayload } from './add-task-bar/add-task-payload-builder';

describe('TaskBuilderService', () => {
  let service: TaskBuilderService;
  let taskService: jasmine.SpyObj<TaskService>;
  let taskRepeatCfgService: jasmine.SpyObj<TaskRepeatCfgService>;
  let tagService: jasmine.SpyObj<TagService>;

  const payload = (overrides: Partial<AddTaskPayload> = {}): AddTaskPayload => ({
    title: 'Buy milk',
    taskData: { projectId: 'INBOX_PROJECT', tagIds: [] },
    isAddToBacklog: false,
    isAddToBottom: false,
    remindOption: TaskReminderOptionId.AtStart,
    repeat: null,
    ...overrides,
  });

  beforeEach(() => {
    taskService = jasmine.createSpyObj('TaskService', [
      'add',
      'getByIdOnce$',
      'scheduleTask',
    ]);
    taskService.add.and.returnValue('task-1');
    taskService.getByIdOnce$.and.returnValue(
      of({ id: 'task-1' } as unknown as Readonly<TaskCopy>),
    );
    taskRepeatCfgService = jasmine.createSpyObj('TaskRepeatCfgService', [
      'addTaskRepeatCfgToTask',
    ]);
    tagService = jasmine.createSpyObj('TagService', ['addTag']);
    tagService.addTag.and.returnValue('tag-new');

    TestBed.configureTestingModule({
      providers: [
        TaskBuilderService,
        { provide: TaskService, useValue: taskService },
        { provide: TaskRepeatCfgService, useValue: taskRepeatCfgService },
        { provide: TagService, useValue: tagService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        {
          provide: SnackService,
          useValue: jasmine.createSpyObj('SnackService', ['open']),
        },
      ],
    });
    service = TestBed.inject(TaskBuilderService);
  });

  it('adds the task with the payload placement flags', () => {
    service.addTask(payload({ isAddToBacklog: true, isAddToBottom: true }));

    expect(taskService.add).toHaveBeenCalledWith(
      'Buy milk',
      true,
      jasmine.objectContaining({ projectId: 'INBOX_PROJECT' }),
      true,
    );
  });

  it('creates the tags the HUD could not create itself and merges their ids', () => {
    service.addTask(
      payload({
        taskData: { projectId: 'INBOX_PROJECT', tagIds: ['tag-existing'] },
        newTagTitles: ['New Tag'],
      }),
    );

    expect(tagService.addTag).toHaveBeenCalledWith({ title: 'New Tag' });
    expect(taskService.add.calls.mostRecent().args[2]).toEqual(
      jasmine.objectContaining({ tagIds: ['tag-existing', 'tag-new'] }),
    );
  });

  it('applies a repeat config when the payload carries one', () => {
    const repeatCfg = {
      ...DEFAULT_TASK_REPEAT_CFG,
      startDate: '2026-06-19',
      title: 'Buy milk',
    };

    service.addTask(
      payload({
        repeat: { type: 'PRESET', quickSetting: 'DAILY' },
        repeatCfg,
      }),
    );

    expect(taskRepeatCfgService.addTaskRepeatCfgToTask).toHaveBeenCalledWith(
      'task-1',
      'INBOX_PROJECT',
      repeatCfg,
    );
  });

  it('schedules a timed task, but leaves a timed recurrence to the repeat effect', () => {
    const dueWithTime = new Date(2026, 5, 19, 9, 30).getTime();

    service.addTask(
      payload({ taskData: { projectId: 'INBOX_PROJECT', tagIds: [], dueWithTime } }),
    );
    expect(taskService.scheduleTask).toHaveBeenCalled();

    taskService.scheduleTask.calls.reset();
    // A non-DIALOG recurrence with a time sets `repeatCfg.startTime`, and
    // addRepeatCfgToTaskUpdateTask$ schedules it — scheduling here too would
    // double-schedule.
    service.addTask(
      payload({
        taskData: { projectId: 'INBOX_PROJECT', tagIds: [], dueWithTime },
        repeat: { type: 'PRESET', quickSetting: 'DAILY' },
        repeatCfg: { ...DEFAULT_TASK_REPEAT_CFG, startTime: '09:30' },
      }),
    );
    expect(taskService.scheduleTask).not.toHaveBeenCalled();
  });

  it('does not write a repeat config for a DIALOG recurrence', () => {
    service.addTask(payload({ repeat: { type: 'DIALOG' } }));

    expect(taskRepeatCfgService.addTaskRepeatCfgToTask).not.toHaveBeenCalled();
  });
});
