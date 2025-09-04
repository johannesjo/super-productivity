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

describe('TaskViewCustomizerService', () => {
  let service: TaskViewCustomizerService;

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
    TestBed.configureTestingModule({
      providers: [
        TaskViewCustomizerService,
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
});
