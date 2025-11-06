import { TestBed } from '@angular/core/testing';
import { TaskViewCustomizerService } from './task-view-customizer.service';
import { Project } from '../project/project.model';
import { Tag } from '../tag/tag.model';
import { TaskWithSubTasks } from '../tasks/task.model';
import { provideMockStore } from '@ngrx/store/testing';
import { selectAllProjects } from '../project/store/project.selectors';
import { selectAllTags } from '../tag/store/tag.reducer';
import { getTomorrow } from '../../util/get-tomorrow';
import { getDbDateStr } from '../../util/get-db-date-str';
import { of } from 'rxjs';
import { WorkContextType } from '../work-context/work-context.model';
import { WorkContextService } from '../work-context/work-context.service';
import { ProjectService } from '../project/project.service';
import { TagService } from '../tag/tag.service';

describe('TaskViewCustomizerService', () => {
  let service: TaskViewCustomizerService;
  let mockWorkContextService: {
    activeWorkContextId: string | null;
    activeWorkContextType: WorkContextType | null;
    todaysTasks$: ReturnType<typeof of<TaskWithSubTasks[]>>;
    undoneTasks$: ReturnType<typeof of<TaskWithSubTasks[]>>;
  };
  let projectUpdateSpy: jasmine.Spy;
  let tagUpdateSpy: jasmine.Spy;

  const todayStr = getDbDateStr(new Date());
  const tomorrowStr = getDbDateStr(getTomorrow());

  const mockProjects: Project[] = [
    { id: 'p1', title: 'Project One' } as Project,
    { id: 'p2', title: 'Project Two' } as Project,
  ];
  const mockTags: Tag[] = [
    { id: 't1', title: 'Tag One' } as Tag,
    { id: 't2', title: 'Tag Two' } as Tag,
  ];
  const mockTasks: TaskWithSubTasks[] = [
    {
      id: 'task1',
      title: 'Alpha',
      tagIds: ['t1'],
      projectId: 'p1',
      dueDay: tomorrowStr,
      timeEstimate: 60000,
      timeSpentOnDay: { [tomorrowStr]: 60000 },
      created: 1,
      subTasks: [],
      subTaskIds: [],
      timeSpent: 60000,
      isDone: false,
      attachments: [],
    } as TaskWithSubTasks,
    {
      id: 'task2',
      title: 'Beta',
      tagIds: ['t2'],
      projectId: 'p2',
      dueDay: todayStr,
      timeEstimate: 120000,
      timeSpentOnDay: { [todayStr]: 120000 },
      created: 2,
      subTasks: [],
      subTaskIds: [],
      timeSpent: 120000,
      isDone: false,
      attachments: [],
    } as TaskWithSubTasks,
    {
      id: 'task3',
      title: 'Third Task',
      tagIds: ['t1', 't2'],
      projectId: '',
      dueDay: todayStr,
      timeEstimate: 120000,
      timeSpentOnDay: { [todayStr]: 120000 },
      created: 3,
      subTasks: [],
      subTaskIds: [],
      timeSpent: 120000,
      isDone: false,
      attachments: [],
    } as TaskWithSubTasks,
    {
      id: 'task4',
      title: 'Zebra',
      tagIds: [],
      projectId: 'p1',
      dueDay: todayStr,
      timeEstimate: 0,
      timeSpentOnDay: { [todayStr]: 0 },
      created: 4,
      subTasks: [],
      subTaskIds: [],
      timeSpent: 0,
      isDone: false,
      attachments: [],
    } as TaskWithSubTasks,
  ];

  beforeEach(() => {
    mockWorkContextService = {
      activeWorkContextId: null,
      activeWorkContextType: null,
      todaysTasks$: of([]),
      undoneTasks$: of([]),
    };
    projectUpdateSpy = jasmine.createSpy('update');
    tagUpdateSpy = jasmine.createSpy('updateTag');

    TestBed.configureTestingModule({
      providers: [
        TaskViewCustomizerService,
        { provide: WorkContextService, useValue: mockWorkContextService },
        { provide: ProjectService, useValue: { update: projectUpdateSpy } },
        { provide: TagService, useValue: { updateTag: tagUpdateSpy } },
        provideMockStore({
          selectors: [
            { selector: selectAllProjects, value: mockProjects },
            { selector: selectAllTags, value: mockTags },
          ],
        }),
      ],
    });
    service = TestBed.inject(TaskViewCustomizerService);
    (service as any)._allProjects = mockProjects;
    (service as any)._allTags = mockTags;
  });

  it('should filter by tag name', () => {
    const filtered = service['applyFilter'](mockTasks, 'tag', 'Tag One');
    expect(filtered.length).toBe(2);
    expect(filtered[0].id).toBe('task1');
    expect(filtered[1].id).toBe('task3');
  });

  it('should return an empty task list when filtering by a tag that doesnt exist', () => {
    const filtered = service['applyFilter'](mockTasks, 'tag', 'Tag Three');
    expect(filtered.length).toBe(0);
  });

  it('should not filter when filtering with an empty tag', () => {
    const filtered = service['applyFilter'](mockTasks, 'tag', '');
    expect(filtered.length).toBe(4);
  });

  it('should filter by project name', () => {
    const filtered = service['applyFilter'](mockTasks, 'project', 'Project Two');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('task2');
  });

  it('should filter by schedule date', () => {
    const filtered = service['applyFilter'](mockTasks, 'scheduledDate', 'tomorrow');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('task1');
  });

  it('should sort by name', () => {
    const sorted = service['applySort'](mockTasks, 'name');
    expect(sorted[0].title).toBe('Alpha');
    expect(sorted[1].title).toBe('Beta');
  });

  it('should sort by tag (primary alphabetical tag title), with untagged last', () => {
    const extra = {
      id: 'task5',
      title: 'Aardvark',
      tagIds: [],
      projectId: 'p1',
      created: 4,
      subTasks: [],
      subTaskIds: [],
      timeEstimate: 0,
      timeSpent: 0,
      timeSpentOnDay: {},
      isDone: false,
      attachments: [],
    } as TaskWithSubTasks;
    const arr = [...mockTasks, extra];
    const sorted = service['applySort'](arr, 'tag');
    expect(sorted.map((t) => t.id)).toEqual([
      'task1',
      'task3',
      'task2',
      'task5',
      'task4',
    ]);
  });

  it('should tie-break by title for tasks with the same primary tag', () => {
    const samePrimary: TaskWithSubTasks[] = [
      {
        id: 'tA',
        title: 'Zed',
        tagIds: ['t1'],
        projectId: 'p1',
        created: 10,
        subTasks: [],
        subTaskIds: [],
        timeEstimate: 0,
        timeSpent: 0,
        timeSpentOnDay: {},
        isDone: false,
        attachments: [],
      } as TaskWithSubTasks,
      {
        id: 'tB',
        title: 'Alpha2',
        tagIds: ['t1'],
        projectId: 'p1',
        created: 11,
        subTasks: [],
        subTaskIds: [],
        timeEstimate: 0,
        timeSpent: 0,
        timeSpentOnDay: {},
        isDone: false,
        attachments: [],
      } as TaskWithSubTasks,
    ];
    const sorted = service['applySort'](samePrimary, 'tag');
    expect(sorted.map((t) => t.id)).toEqual(['tB', 'tA']);
  });

  it('should group by tag', () => {
    const grouped = service['applyGrouping'](mockTasks, 'tag');
    expect(Object.keys(grouped)).toContain('Tag One');
    expect(Object.keys(grouped)).toContain('Tag Two');
    expect(grouped['Tag One'][0].id).toBe('task1');
    expect(grouped['Tag Two'][0].id).toBe('task2');
  });

  it('should group by project', () => {
    const grouped = service['applyGrouping'](mockTasks, 'project');
    expect(Object.keys(grouped)).toContain('Project One');
    expect(Object.keys(grouped)).toContain('Project Two');
    expect(grouped['Project One'][0].id).toBe('task1');
    expect(grouped['Project Two'][0].id).toBe('task2');
  });

  it('should group by tag with a task in two groups', () => {
    const grouped = service['applyGrouping'](mockTasks, 'tag');
    expect(Object.keys(grouped)).toContain('Tag One');
    expect(Object.keys(grouped)).toContain('Tag Two');
    expect(grouped['Tag One'][0].id).toBe('task1');
    expect(grouped['Tag One'][1].id).toBe('task3');
    expect(grouped['Tag Two'][0].id).toBe('task2');
    expect(grouped['Tag Two'][1].id).toBe('task3');
  });

  it('should group by scheduledDate using dueDay', () => {
    const grouped = service['applyGrouping'](mockTasks, 'scheduledDate');
    expect(Object.keys(grouped)).toContain(todayStr);
    expect(Object.keys(grouped)).toContain(tomorrowStr);
    expect(grouped[tomorrowStr].length).toBe(1);
    expect(grouped[todayStr].length).toBe(3);
  });

  it('should group by scheduledDate using dueWithTime when dueDay is not set', () => {
    const tomorrowTimestamp = getTomorrow().getTime();
    const taskWithTime: TaskWithSubTasks = {
      id: 'task-with-time',
      title: 'Task with time',
      tagIds: [],
      projectId: 'p1',
      dueWithTime: tomorrowTimestamp,
      timeEstimate: 0,
      timeSpentOnDay: {},
      created: 5,
      subTasks: [],
      subTaskIds: [],
      timeSpent: 0,
      isDone: false,
      attachments: [],
    } as TaskWithSubTasks;

    const tasksWithTimeTask = [...mockTasks, taskWithTime];
    const grouped = service['applyGrouping'](tasksWithTimeTask, 'scheduledDate');

    expect(Object.keys(grouped)).toContain(tomorrowStr);
    expect(grouped[tomorrowStr].length).toBe(2);
    expect(grouped[tomorrowStr].some((t) => t.id === 'task-with-time')).toBe(true);
  });

  it('should group tasks with no schedule into "No date" group', () => {
    const taskWithoutSchedule: TaskWithSubTasks = {
      id: 'task-no-date',
      title: 'Task without date',
      tagIds: [],
      projectId: 'p1',
      timeEstimate: 0,
      timeSpentOnDay: {},
      created: 6,
      subTasks: [],
      subTaskIds: [],
      timeSpent: 0,
      isDone: false,
      attachments: [],
    } as TaskWithSubTasks;

    const grouped = service['applyGrouping']([taskWithoutSchedule], 'scheduledDate');
    expect(Object.keys(grouped)).toContain('No date');
    expect(grouped['No date'].length).toBe(1);
    expect(grouped['No date'][0].id).toBe('task-no-date');
  });

  it('should reset all customizer values to default', () => {
    service.selectedSort.set('name');
    service.selectedGroup.set('tag');
    service.selectedFilter.set('project');
    service.filterInputValue.set('something');

    service.resetAll();

    expect(service.selectedSort()).toBe('default');
    expect(service.selectedGroup()).toBe('default');
    expect(service.selectedFilter()).toBe('default');
    expect(service.filterInputValue()).toBe('');
  });

  describe('sortPermanent', () => {
    const createTask = (
      id: string,
      title: string,
      projectId: string | null = 'project-sort',
    ): TaskWithSubTasks =>
      ({
        id,
        title,
        projectId: projectId ?? undefined,
        tagIds: [],
        subTasks: [],
        subTaskIds: [],
        created: 0,
        timeEstimate: 0,
        timeSpent: 0,
        timeSpentOnDay: {},
        isDone: false,
        attachments: [],
      }) as TaskWithSubTasks;

    beforeEach(() => {
      projectUpdateSpy.calls.reset();
      tagUpdateSpy.calls.reset();
      service.resetAll();
    });

    it('should persist the sorted order for a project context and reset customizer state', async () => {
      const taskA = createTask('a', 'Alpha');
      const taskB = createTask('b', 'Bravo');
      mockWorkContextService.activeWorkContextId = 'project-sort';
      mockWorkContextService.activeWorkContextType = WorkContextType.PROJECT;
      mockWorkContextService.todaysTasks$ = of([taskB, taskA]);
      mockWorkContextService.undoneTasks$ = of([taskB, taskA]);

      service.setSort('name');
      service.setFilter('tag');
      service.setFilterInputValue('Tag One');
      service.setGroup('project');

      await service.sortPermanent('name');

      expect(projectUpdateSpy).toHaveBeenCalledTimes(1);
      expect(projectUpdateSpy).toHaveBeenCalledWith('project-sort', {
        taskIds: ['a', 'b'],
      });
      expect(tagUpdateSpy).not.toHaveBeenCalled();
      expect(service.selectedSort()).toBe('default');
      expect(service.selectedGroup()).toBe('default');
      expect(service.selectedFilter()).toBe('default');
      expect(service.filterInputValue()).toBe('');
    });

    it('should persist the sorted order for a tag context', async () => {
      const taskA = createTask('a', 'Alpha', null);
      const taskB = createTask('b', 'Bravo', null);
      mockWorkContextService.activeWorkContextId = 'tag-sort';
      mockWorkContextService.activeWorkContextType = WorkContextType.TAG;
      mockWorkContextService.todaysTasks$ = of([taskB, taskA]);
      mockWorkContextService.undoneTasks$ = of([taskB, taskA]);

      await service.sortPermanent('name');

      expect(tagUpdateSpy).toHaveBeenCalledTimes(1);
      expect(tagUpdateSpy).toHaveBeenCalledWith('tag-sort', {
        taskIds: ['a', 'b'],
      });
      expect(projectUpdateSpy).not.toHaveBeenCalled();
    });

    it('should skip persistence when default sorting is requested but still reset', async () => {
      mockWorkContextService.activeWorkContextId = 'project-sort';
      mockWorkContextService.activeWorkContextType = WorkContextType.PROJECT;
      mockWorkContextService.todaysTasks$ = of([]);
      mockWorkContextService.undoneTasks$ = of([]);

      service.setSort('name');

      await service.sortPermanent('default');

      expect(projectUpdateSpy).not.toHaveBeenCalled();
      expect(tagUpdateSpy).not.toHaveBeenCalled();
      expect(service.selectedSort()).toBe('default');
      expect(service.selectedGroup()).toBe('default');
      expect(service.selectedFilter()).toBe('default');
      expect(service.filterInputValue()).toBe('');
    });
  });
});
