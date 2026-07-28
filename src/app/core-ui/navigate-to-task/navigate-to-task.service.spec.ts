import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavigateToTaskService } from './navigate-to-task.service';
import { TaskService } from '../../features/tasks/task.service';
import { ProjectService } from '../../features/project/project.service';
import { SnackService } from '../../core/snack/snack.service';
import { DateService } from '../../core/date/date.service';
import { LayoutService } from '../layout/layout.service';
import { Task } from '../../features/tasks/task.model';
import { INBOX_PROJECT } from '../../features/project/project.const';
import { BehaviorSubject, from, of } from 'rxjs';
import { Project } from '../../features/project/project.model';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { PROJECT_FEATURE_NAME } from '../../features/project/store/project.reducer';
import { TASK_FEATURE_NAME } from '../../features/tasks/store/task.reducer';
import { TaskSharedActions } from '../../root-store/meta/task-shared.actions';

const TODAY_STR = '2026-07-06';

const createTask = (partial: Partial<Task>): Task =>
  ({
    id: 'task-1',
    title: 'A task',
    projectId: undefined,
    parentId: undefined,
    tagIds: [],
    dueDay: undefined,
    dueWithTime: undefined,
    timeSpentOnDay: {},
    created: Date.parse('2020-01-01'),
    ...partial,
  }) as unknown as Task;

describe('NavigateToTaskService', () => {
  let service: NavigateToTaskService;
  let taskService: jasmine.SpyObj<TaskService>;
  let router: jasmine.SpyObj<Router> & { url: string };
  let layoutService: jasmine.SpyObj<LayoutService>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let projects$: BehaviorSubject<Project[]>;
  let store: MockStore;

  const createProject = (
    id: string,
    taskIds: string[] = [],
    backlogTaskIds: string[] = [],
  ): Project => ({
    ...INBOX_PROJECT,
    id,
    title: `Project ${id}`,
    taskIds,
    backlogTaskIds,
  });

  const setProject = (
    id: string,
    taskIds: string[],
    backlogTaskIds: string[] = [],
  ): void => {
    const project = createProject(id, taskIds, backlogTaskIds);
    projectService.getByIdOnce$.and.returnValue(of(project));
    projects$.next([project]);
  };

  const setStoreState = (tasks: Task[], projects: Project[]): void => {
    store.setState({
      [TASK_FEATURE_NAME]: {
        ids: tasks.map(({ id }) => id),
        entities: Object.fromEntries(tasks.map((task) => [task.id, task])),
        currentTaskId: null,
        selectedTaskId: null,
        taskDetailTargetPanel: null,
        isDataLoaded: true,
      },
      [PROJECT_FEATURE_NAME]: {
        ids: projects.map(({ id }) => id),
        entities: Object.fromEntries(projects.map((project) => [project.id, project])),
      },
    });
    store.refreshState();
  };

  const setNavigatedTask = (task: Task, projects: Project[] = [INBOX_PROJECT]): void => {
    setStoreState([task], projects);
    taskService.getByIdFromEverywhere.and.resolveTo(task);
  };

  beforeEach(() => {
    taskService = jasmine.createSpyObj('TaskService', [
      'getByIdFromEverywhere',
      'getArchivedTasks',
      'update',
    ]);
    projects$ = new BehaviorSubject<Project[]>([]);
    projectService = jasmine.createSpyObj('ProjectService', ['getByIdOnce$'], {
      list$: projects$.asObservable(),
    });
    projectService.getByIdOnce$.and.returnValue(of(undefined));
    const snackService = jasmine.createSpyObj('SnackService', ['open']);
    const dateService = jasmine.createSpyObj('DateService', ['isToday', 'todayStr']);
    dateService.todayStr.and.returnValue(TODAY_STR);
    dateService.isToday.and.returnValue(false);
    layoutService = jasmine.createSpyObj('LayoutService', ['focusTaskInViewWhenReady']);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.resolveTo(true);
    routerSpy.url = '/search';
    router = routerSpy;

    TestBed.configureTestingModule({
      providers: [
        NavigateToTaskService,
        provideMockStore({
          initialState: {
            [TASK_FEATURE_NAME]: {
              ids: [],
              entities: {},
              currentTaskId: null,
              selectedTaskId: null,
              taskDetailTargetPanel: null,
              isDataLoaded: true,
            },
            [PROJECT_FEATURE_NAME]: {
              ids: [INBOX_PROJECT.id],
              entities: { [INBOX_PROJECT.id]: INBOX_PROJECT },
            },
          },
        }),
        { provide: TaskService, useValue: taskService },
        { provide: ProjectService, useValue: projectService },
        { provide: SnackService, useValue: snackService },
        { provide: DateService, useValue: dateService },
        { provide: LayoutService, useValue: layoutService },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(NavigateToTaskService);
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callThrough();
  });

  it('self-heals an orphan task (no project, no tags, not due today) into the Inbox and navigates there (#8780)', async () => {
    // Empty-string projectId is the real-world case: it survives hydration
    // (passes typia validation, unlike `undefined`). With no tags and no due
    // date, the task's id is in no project's or tag's `taskIds` array and it is
    // not overdue/due-today, so it renders in no reachable list. It must be
    // re-homed into the Inbox to become focusable.
    const task = createTask({ id: 't1', projectId: '', tagIds: [] });
    setNavigatedTask(task);

    await service.navigate('t1');

    expect(taskService.update).toHaveBeenCalledWith('t1', {
      projectId: INBOX_PROJECT.id,
    });
    expect(router.navigate).toHaveBeenCalledWith(
      [`/project/${INBOX_PROJECT.id}/tasks`],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ focusItem: 't1' }),
      }),
    );
    // Must NOT be short-circuited into the "same context" focus-only path.
    expect(layoutService.focusTaskInViewWhenReady).not.toHaveBeenCalled();
  });

  it('navigates to the project list for a project task without re-homing it', async () => {
    setProject('p1', ['t2']);
    taskService.getByIdFromEverywhere.and.resolveTo(
      createTask({ id: 't2', projectId: 'p1', tagIds: [] }),
    );

    await service.navigate('t2');

    expect(router.navigate).toHaveBeenCalledWith(
      ['/project/p1/tasks'],
      jasmine.anything(),
    );
    expect(taskService.update).not.toHaveBeenCalled();
  });

  it('self-heals a tagged task with no project into the Inbox', async () => {
    const task = createTask({
      id: 't3',
      projectId: undefined,
      tagIds: ['tag-a'],
    });
    setNavigatedTask(task);

    await service.navigate('t3');

    expect(taskService.update).toHaveBeenCalledWith('t3', {
      projectId: INBOX_PROJECT.id,
    });
    expect(router.navigate).toHaveBeenCalledWith(
      [`/project/${INBOX_PROJECT.id}/tasks`],
      jasmine.anything(),
    );
  });

  it('self-heals a due-today task with no project into the Inbox', async () => {
    const task = createTask({
      id: 't4',
      projectId: undefined,
      tagIds: [],
      dueDay: TODAY_STR,
    });
    setNavigatedTask(task);

    await service.navigate('t4');

    expect(taskService.update).toHaveBeenCalledWith('t4', {
      projectId: INBOX_PROJECT.id,
    });
    expect(router.navigate).toHaveBeenCalledWith(
      [`/project/${INBOX_PROJECT.id}/tasks`],
      jasmine.anything(),
    );
  });

  it('surfaces an error snack instead of silently failing when a same-context task cannot be focused', async () => {
    const snackService = TestBed.inject(SnackService) as jasmine.SpyObj<SnackService>;
    // Already on the task's context so navigate() takes the same-context branch.
    router.url = `/project/p1/tasks`;
    setProject('p1', ['t5']);
    taskService.getByIdFromEverywhere.and.resolveTo(
      createTask({ id: 't5', projectId: 'p1', tagIds: [] }),
    );
    // Simulate focus never succeeding → onFailure invoked.
    layoutService.focusTaskInViewWhenReady.and.callFake(
      (_taskId, _onSuccess, onFailure) => onFailure?.(),
    );

    await service.navigate('t5');

    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackService.open).toHaveBeenCalledWith(
      jasmine.objectContaining({ type: 'ERROR' }),
    );
  });

  it('heals an orphan and focuses it in place when already on the Inbox (same-context)', async () => {
    // Already on the Inbox, so navigate() takes the same-context branch — but the
    // heal must still fire first so the task is added to the Inbox list.
    router.url = `/project/${INBOX_PROJECT.id}/tasks`;
    const task = createTask({ id: 't6', projectId: '', tagIds: [] });
    setNavigatedTask(task);

    await service.navigate('t6');

    expect(taskService.update).toHaveBeenCalledWith('t6', {
      projectId: INBOX_PROJECT.id,
    });
    expect(router.navigate).not.toHaveBeenCalled();
    expect(layoutService.focusTaskInViewWhenReady).toHaveBeenCalled();
  });

  it('repairs a task missing from its project list before navigating (#8780)', async () => {
    setProject(INBOX_PROJECT.id, []);
    const task = createTask({
      id: 'unlisted-inbox-task',
      projectId: INBOX_PROJECT.id,
      tagIds: [],
      subTaskIds: ['child'],
    });
    const child = createTask({
      id: 'child',
      projectId: INBOX_PROJECT.id,
      parentId: task.id,
    });
    setStoreState([task, child], [createProject(INBOX_PROJECT.id)]);
    taskService.getByIdFromEverywhere.and.resolveTo(task);

    await service.navigate('unlisted-inbox-task');

    const repairAction = TaskSharedActions.updateTask({
      task: {
        id: task.id,
        changes: { projectId: INBOX_PROJECT.id },
      },
      projectMoveSubTaskIds: [],
    });
    expect(store.dispatch).toHaveBeenCalledWith(repairAction);
    expect(repairAction.meta.entityIds).toEqual([task.id]);
    expect(taskService.update).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      [`/project/${INBOX_PROJECT.id}/tasks`],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ focusItem: 'unlisted-inbox-task' }),
      }),
    );
  });

  it('does not apply a stale repair after the task moves during project lookup', async () => {
    const staleTask = createTask({
      id: 'moved-task',
      projectId: 'project-1',
      tagIds: [],
    });
    const movedTask = createTask({
      ...staleTask,
      projectId: 'project-2',
    });
    const project1 = createProject('project-1');
    const project2 = createProject('project-2', [movedTask.id]);
    let resolveProjectLookup!: (project: Project | undefined) => void;
    const projectLookup = new Promise<Project | undefined>((resolve) => {
      resolveProjectLookup = resolve;
    });
    projectService.getByIdOnce$.and.returnValue(from(projectLookup));
    projects$.next([project1, project2]);
    setStoreState([staleTask], [project1, project2]);
    taskService.getByIdFromEverywhere.and.resolveTo(staleTask);

    const navigation = service.navigate(staleTask.id);
    await Promise.resolve();
    expect(projectService.getByIdOnce$).toHaveBeenCalledWith(project1.id);

    setStoreState([movedTask], [project1, project2]);
    resolveProjectLookup(project1);
    await navigation;

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(taskService.update).not.toHaveBeenCalled();
  });

  it('does not dispatch when membership was restored during project lookup', async () => {
    const task = createTask({
      id: 'concurrently-listed-task',
      projectId: 'project-1',
      tagIds: [],
    });
    const staleProject = createProject('project-1');
    const currentProject = createProject('project-1', [task.id]);
    projectService.getByIdOnce$.and.returnValue(of(staleProject));
    projects$.next([currentProject]);
    setStoreState([task], [currentProject]);
    taskService.getByIdFromEverywhere.and.resolveTo(task);

    await service.navigate(task.id);

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(taskService.update).not.toHaveBeenCalled();
  });

  it('repairs a dangling project reference into the Inbox before navigating (#8780)', async () => {
    projectService.getByIdOnce$.and.returnValue(of(undefined));
    const task = createTask({
      id: 'dangling-task',
      projectId: 'deleted-project',
      tagIds: [],
    });
    setNavigatedTask(task);

    await service.navigate('dangling-task');

    expect(taskService.update).toHaveBeenCalledWith('dangling-task', {
      projectId: INBOX_PROJECT.id,
    });
    expect(router.navigate).toHaveBeenCalledWith(
      [`/project/${INBOX_PROJECT.id}/tasks`],
      jasmine.anything(),
    );
  });

  it('opens the backlog when navigating to a subtask whose parent is there', async () => {
    const parent = createTask({
      id: 'backlog-parent',
      projectId: 'p1',
      subTaskIds: ['backlog-child'],
    });
    const child = createTask({
      id: 'backlog-child',
      parentId: parent.id,
      projectId: parent.projectId,
    });
    setProject('p1', [], [parent.id]);
    taskService.getByIdFromEverywhere.and.callFake((id: string) =>
      Promise.resolve(id === child.id ? child : parent),
    );

    await service.navigate(child.id);

    expect(taskService.update).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/project/p1/tasks'],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({
          focusItem: child.id,
          isInBacklog: true,
        }),
      }),
    );
  });

  it('does NOT repair an orphaned subtask whose parent cannot be loaded', async () => {
    // The subtask itself resolves; its parent lookup returns undefined, so
    // `taskToCheck` stays the subtask. It routes to the Inbox but must NOT be
    // repaired as a top-level task (which would corrupt the parent/child link).
    taskService.getByIdFromEverywhere.and.callFake((id: string) =>
      Promise.resolve(
        id === 'sub-1'
          ? createTask({
              id: 'sub-1',
              parentId: 'missing-parent',
              projectId: '',
              tagIds: [],
            })
          : (undefined as unknown as Task),
      ),
    );

    await service.navigate('sub-1');

    expect(taskService.update).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      [`/project/${INBOX_PROJECT.id}/tasks`],
      jasmine.anything(),
    );
  });
});
