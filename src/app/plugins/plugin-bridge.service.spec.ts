import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PluginBridgeService } from './plugin-bridge.service';
import { TaskService } from '../features/tasks/task.service';
import { ProjectService } from '../features/project/project.service';
import { TagService } from '../features/tag/tag.service';
import { WorkContextService } from '../features/work-context/work-context.service';
import { Store } from '@ngrx/store';
import { SnackService } from '../core/snack/snack.service';
import { NotifyService } from '../core/notify/notify.service';
import { PluginService } from './plugin.service';
import { Task, TaskCopy } from '../features/tasks/task.model';
import { Project, ProjectCopy } from '../features/project/project.model';
import { Tag, TagCopy } from '../features/tag/tag.model';
// import { PluginInstance } from './plugin-api.model';
import { WorkContext } from '../features/work-context/work-context.model';
import { GlobalConfigService } from '../features/config/global-config.service';

describe('PluginBridgeService', () => {
  let service: PluginBridgeService;
  let taskService: jasmine.SpyObj<TaskService>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let tagService: jasmine.SpyObj<TagService>;
  let workContextService: jasmine.SpyObj<WorkContextService>;
  let store: jasmine.SpyObj<Store>;
  let snackService: jasmine.SpyObj<SnackService>;
  let notifyService: jasmine.SpyObj<NotifyService>;
  let matDialog: jasmine.SpyObj<MatDialog>;
  let router: jasmine.SpyObj<Router>;
  let pluginService: jasmine.SpyObj<PluginService>;
  let globalConfigService: jasmine.SpyObj<GlobalConfigService>;
  let electronService: jasmine.SpyObj<ElectronService>;

  const mockPlugin: Plugin = {
    id: 'test-plugin',
    name: 'Test Plugin',
    enabled: true,
    config: {},
    version: '1.0.0',
    author: 'Test Author',
    description: 'Test Description',
    indexHtml: '<div>Test</div>',
  };

  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    notes: 'Test notes',
    projectId: 'project-1',
    tagIds: ['tag-1'],
    created: Date.now(),
    timeSpentOnDay: {},
    timeSpent: 0,
    timeEstimate: 0,
    isDone: false,
    doneOn: undefined,
    plannedAt: null,
    reminderId: undefined,
    parentId: undefined,
    attachments: [],
    issueId: undefined,
    issuePoints: undefined,
    issueType: undefined,
    issueAttachmentNr: undefined,
    issueLastUpdated: undefined,
    issueWasUpdated: false,
    subTaskIds: [],
    repeatCfgId: undefined,
    _showSubTasksMode: 2,
  };

  const mockProject: Project = {
    id: 'project-1',
    title: 'Test Project',
    isArchived: false,
    isHiddenFromMenu: false,
    isEnableBacklog: false,
    backlogTaskIds: [],
    taskIds: ['task-1'],
    noteIds: [],
    lastCompletedDay: null,
    workStart: {},
    workEnd: {},
    theme: {
      isAutoContrast: true,
      isDisableBackgroundGradient: false,
      primary: '',
      huePrimary: '500',
      accent: '',
      hueAccent: '500',
      warn: '',
      hueWarn: '500',
      backgroundImageDark: null,
      backgroundImageLight: null,
      isAutoAccent: false,
    },
  };

  const mockTag: Tag = {
    id: 'tag-1',
    title: 'Test Tag',
    color: '#000000',
    created: Date.now(),
    icon: null,
    taskIds: ['task-1'],
  };

  const mockWorkContext: WorkContext = {
    type: 'PROJECT',
    routeParams: { projectId: 'project-1' },
    taskIds: ['task-1'],
    isActiveContext: true,
    isArchived: false,
    theme: mockProject.theme,
  };

  beforeEach(() => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'getAllTasks$',
      'getByIdOnce$',
      'update',
      'add',
      'getByIds$',
      'updateOrder',
    ]);
    const projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'list$',
      'getByIdOnce$',
      'update',
      'add',
    ]);
    const tagServiceSpy = jasmine.createSpyObj('TagService', [
      'getTags$',
      'getByIdOnce$',
      'update',
      'add',
    ]);
    const workContextServiceSpy = jasmine.createSpyObj('WorkContextService', [
      'activeWorkContext$',
    ]);
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const snackServiceSpy = jasmine.createSpyObj('SnackService', ['open']);
    const notifyServiceSpy = jasmine.createSpyObj('NotifyService', ['notify']);
    const matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const pluginServiceSpy = jasmine.createSpyObj('PluginService', [
      'updatePluginPersistedData',
    ]);
    const globalConfigServiceSpy = jasmine.createSpyObj('GlobalConfigService', [
      'theme$',
    ]);
    const electronServiceSpy = jasmine.createSpyObj('ElectronService', [
      'execNodeScript',
    ]);

    TestBed.configureTestingModule({
      providers: [
        PluginBridgeService,
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: TagService, useValue: tagServiceSpy },
        { provide: WorkContextService, useValue: workContextServiceSpy },
        { provide: Store, useValue: storeSpy },
        { provide: SnackService, useValue: snackServiceSpy },
        { provide: NotifyService, useValue: notifyServiceSpy },
        { provide: MatDialog, useValue: matDialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: PluginService, useValue: pluginServiceSpy },
        { provide: GlobalConfigService, useValue: globalConfigServiceSpy },
        { provide: ElectronService, useValue: electronServiceSpy },
      ],
    });

    service = TestBed.inject(PluginBridgeService);
    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
    projectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    tagService = TestBed.inject(TagService) as jasmine.SpyObj<TagService>;
    workContextService = TestBed.inject(
      WorkContextService,
    ) as jasmine.SpyObj<WorkContextService>;
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    snackService = TestBed.inject(SnackService) as jasmine.SpyObj<SnackService>;
    notifyService = TestBed.inject(NotifyService) as jasmine.SpyObj<NotifyService>;
    matDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    pluginService = TestBed.inject(PluginService) as jasmine.SpyObj<PluginService>;
    globalConfigService = TestBed.inject(
      GlobalConfigService,
    ) as jasmine.SpyObj<GlobalConfigService>;
    electronService = TestBed.inject(ElectronService) as jasmine.SpyObj<ElectronService>;

    // Setup default mock returns
    taskService.getAllTasks$.and.returnValue(of([mockTask]));
    projectService.list$.and.returnValue(of([mockProject]));
    tagService.getTags$.and.returnValue(of([mockTag]));
    workContextService.activeWorkContext$.and.returnValue(of(mockWorkContext));
    globalConfigService.theme$.and.returnValue(
      of({ isDarkTheme: false, isDisableBackgroundGradient: false }),
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('_setCurrentPlugin', () => {
    it('should set the current plugin', () => {
      service._setCurrentPlugin(mockPlugin);
      expect(service['_currentPlugin']).toEqual(mockPlugin);
    });
  });

  describe('showSnack', () => {
    it('should show a snack with the provided message', async () => {
      service._setCurrentPlugin(mockPlugin);
      const message = 'Test message';

      await service.showSnack(message);

      expect(snackService.open).toHaveBeenCalledWith({
        msg: message,
        type: 'SUCCESS',
      });
    });

    it('should reject if no current plugin is set', async () => {
      await expectAsync(service.showSnack('Test')).toBeRejectedWithError(
        'No current plugin set',
      );
    });

    it('should reject if message is not a string', async () => {
      service._setCurrentPlugin(mockPlugin);
      await expectAsync(service.showSnack(123 as any)).toBeRejectedWithError();
    });
  });

  describe('notify', () => {
    it('should show a notification with the provided message', async () => {
      service._setCurrentPlugin(mockPlugin);
      const message = 'Test notification';

      await service.notify(message);

      expect(notifyService.notify).toHaveBeenCalledWith({
        title: message,
      });
    });

    it('should reject if no current plugin is set', async () => {
      await expectAsync(service.notify('Test')).toBeRejectedWithError(
        'No current plugin set',
      );
    });
  });

  describe('openDialog', () => {
    it('should open a dialog with the provided config', async () => {
      service._setCurrentPlugin(mockPlugin);
      const dialogRef = { afterClosed: () => of('result') };
      matDialog.open.and.returnValue(dialogRef as any);

      const config = {
        title: 'Test Dialog',
        content: 'Test content',
        buttons: [{ text: 'OK', onClick: () => {} }],
      };

      const result = await service.openDialog(config);

      expect(matDialog.open).toHaveBeenCalled();
      expect(result).toBe('result');
    });
  });

  describe('showIndexHtmlAsView', () => {
    it('should navigate to plugin view', async () => {
      service._setCurrentPlugin(mockPlugin);
      router.navigate.and.returnValue(Promise.resolve(true));

      await service.showIndexHtmlAsView();

      expect(router.navigate).toHaveBeenCalledWith(['plugins', mockPlugin.id]);
    });
  });

  describe('getTasks', () => {
    it('should return all tasks', async () => {
      service._setCurrentPlugin(mockPlugin);

      const tasks = await service.getTasks();

      expect(tasks).toEqual([mockTask as TaskCopy]);
    });

    it('should handle errors', async () => {
      service._setCurrentPlugin(mockPlugin);
      taskService.getAllTasks$.and.returnValue(throwError(() => new Error('Test error')));

      await expectAsync(service.getTasks()).toBeRejectedWithError('Test error');
    });
  });

  describe('getArchivedTasks', () => {
    it('should return archived tasks', async () => {
      service._setCurrentPlugin(mockPlugin);
      const archivedTask = { ...mockTask, isDone: true };
      store.select.and.returnValue(of([archivedTask]));

      const tasks = await service.getArchivedTasks();

      expect(tasks).toEqual([archivedTask as TaskCopy]);
    });
  });

  describe('getCurrentContextTasks', () => {
    it('should return tasks from current work context', async () => {
      service._setCurrentPlugin(mockPlugin);
      taskService.getByIds$.and.returnValue(of([mockTask]));

      const tasks = await service.getCurrentContextTasks();

      expect(taskService.getByIds$).toHaveBeenCalledWith(['task-1']);
      expect(tasks).toEqual([mockTask as TaskCopy]);
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      service._setCurrentPlugin(mockPlugin);
      taskService.getByIdOnce$.and.returnValue(of(mockTask));
      projectService.getByIdOnce$.and.returnValue(of(mockProject));
      tagService.getByIdOnce$.and.returnValue(of(mockTag));

      const updates = { title: 'Updated Task' };

      await service.updateTask('task-1', updates);

      expect(taskService.update).toHaveBeenCalledWith('task-1', updates);
    });

    it('should validate project references', async () => {
      service._setCurrentPlugin(mockPlugin);
      taskService.getByIdOnce$.and.returnValue(of(mockTask));
      projectService.getByIdOnce$.and.returnValue(of(null));

      const updates = { projectId: 'invalid-project' };

      await expectAsync(service.updateTask('task-1', updates)).toBeRejectedWithError(
        'Project with id invalid-project not found',
      );
    });

    it('should validate tag references', async () => {
      service._setCurrentPlugin(mockPlugin);
      taskService.getByIdOnce$.and.returnValue(of(mockTask));
      tagService.getByIdOnce$.and.returnValue(of(null));

      const updates = { tagIds: ['invalid-tag'] };

      await expectAsync(service.updateTask('task-1', updates)).toBeRejectedWithError(
        'Tag with id invalid-tag not found',
      );
    });
  });

  describe('addTask', () => {
    it('should add a new task', async () => {
      service._setCurrentPlugin(mockPlugin);
      projectService.getByIdOnce$.and.returnValue(of(mockProject));
      tagService.getByIdOnce$.and.returnValue(of(mockTag));
      taskService.add.and.returnValue(of(mockTask));

      const newTask = {
        title: 'New Task',
        projectId: 'project-1',
        tagIds: ['tag-1'],
      };

      const result = await service.addTask(newTask);

      expect(taskService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'New Task',
          projectId: 'project-1',
          tagIds: ['tag-1'],
        }),
      );
      expect(result).toEqual(mockTask as TaskCopy);
    });

    it('should add subtasks if provided', async () => {
      service._setCurrentPlugin(mockPlugin);
      const parentTask = { ...mockTask, id: 'parent-task' };
      const subTask = { ...mockTask, id: 'sub-task', parentId: 'parent-task' };

      taskService.add.and.returnValues(of(parentTask), of(subTask));

      const newTask = {
        title: 'Parent Task',
        subTasks: [{ title: 'Sub Task' }],
      };

      const result = await service.addTask(newTask);

      expect(taskService.add).toHaveBeenCalledTimes(2);
      expect(result).toEqual(parentTask as TaskCopy);
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects', async () => {
      service._setCurrentPlugin(mockPlugin);

      const projects = await service.getAllProjects();

      expect(projects).toEqual([mockProject as ProjectCopy]);
    });
  });

  describe('addProject', () => {
    it('should add a new project', async () => {
      service._setCurrentPlugin(mockPlugin);
      projectService.add.and.returnValue(of(mockProject));

      const newProject = { title: 'New Project' };

      const result = await service.addProject(newProject);

      expect(projectService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'New Project',
        }),
      );
      expect(result).toEqual(mockProject as ProjectCopy);
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      service._setCurrentPlugin(mockPlugin);
      projectService.getByIdOnce$.and.returnValue(of(mockProject));

      const updates = { title: 'Updated Project' };

      await service.updateProject('project-1', updates);

      expect(projectService.update).toHaveBeenCalledWith('project-1', updates);
    });

    it('should reject if project not found', async () => {
      service._setCurrentPlugin(mockPlugin);
      projectService.getByIdOnce$.and.returnValue(of(null));

      await expectAsync(service.updateProject('invalid-id', {})).toBeRejectedWithError(
        'Project with id invalid-id not found',
      );
    });
  });

  describe('getAllTags', () => {
    it('should return all tags', async () => {
      service._setCurrentPlugin(mockPlugin);

      const tags = await service.getAllTags();

      expect(tags).toEqual([mockTag as TagCopy]);
    });
  });

  describe('addTag', () => {
    it('should add a new tag', async () => {
      service._setCurrentPlugin(mockPlugin);
      tagService.add.and.returnValue(of(mockTag));

      const newTag = { title: 'New Tag' };

      const result = await service.addTag(newTag);

      expect(tagService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'New Tag',
        }),
      );
      expect(result).toEqual(mockTag as TagCopy);
    });
  });

  describe('updateTag', () => {
    it('should update a tag', async () => {
      service._setCurrentPlugin(mockPlugin);
      tagService.getByIdOnce$.and.returnValue(of(mockTag));

      const updates = { title: 'Updated Tag' };

      await service.updateTag('tag-1', updates);

      expect(tagService.update).toHaveBeenCalledWith('tag-1', updates);
    });

    it('should reject if tag not found', async () => {
      service._setCurrentPlugin(mockPlugin);
      tagService.getByIdOnce$.and.returnValue(of(null));

      await expectAsync(service.updateTag('invalid-id', {})).toBeRejectedWithError(
        'Tag with id invalid-id not found',
      );
    });
  });

  describe('reorderTasks', () => {
    it('should reorder tasks in a project', async () => {
      service._setCurrentPlugin(mockPlugin);
      projectService.getByIdOnce$.and.returnValue(of(mockProject));

      const taskIds = ['task-2', 'task-1'];

      await service.reorderTasks('project-1', taskIds);

      expect(projectService.update).toHaveBeenCalledWith('project-1', {
        taskIds,
      });
    });

    it('should reorder subtasks in a parent task', async () => {
      service._setCurrentPlugin(mockPlugin);
      const parentTask = { ...mockTask, subTaskIds: ['sub-1', 'sub-2'] };
      taskService.getByIdOnce$.and.returnValue(of(parentTask));

      const taskIds = ['sub-2', 'sub-1'];

      await service.reorderTasks(null, taskIds, 'task-1');

      expect(taskService.updateOrder).toHaveBeenCalledWith(taskIds);
    });
  });

  describe('persistDataSynced', () => {
    it('should persist plugin data', async () => {
      service._setCurrentPlugin(mockPlugin);
      pluginService.updatePluginPersistedData.and.returnValue(Promise.resolve());

      const data = { key: 'value' };

      await service.persistDataSynced(data);

      expect(pluginService.updatePluginPersistedData).toHaveBeenCalledWith(
        mockPlugin.id,
        data,
      );
    });
  });

  describe('loadPersistedData', () => {
    it('should load persisted plugin data', async () => {
      const pluginWithData = { ...mockPlugin, persistedData: { key: 'value' } };
      service._setCurrentPlugin(pluginWithData);

      const data = await service.loadPersistedData();

      expect(data).toEqual({ key: 'value' });
    });

    it('should return null if no persisted data', async () => {
      service._setCurrentPlugin(mockPlugin);

      const data = await service.loadPersistedData();

      expect(data).toBeNull();
    });
  });

  describe('registerHook', () => {
    it('should register a hook handler', async () => {
      service._setCurrentPlugin(mockPlugin);
      const handler = jasmine.createSpy('handler');

      await service.registerHook('taskAdd', handler);

      expect(service['_hooks'].taskAdd).toContain(
        jasmine.objectContaining({
          pluginId: mockPlugin.id,
          handler,
        }),
      );
    });
  });

  describe('unregisterPluginHooks', () => {
    it('should unregister all hooks for a plugin', () => {
      service._setCurrentPlugin(mockPlugin);
      const handler = jasmine.createSpy('handler');
      service['_hooks'].taskAdd = [
        {
          pluginId: mockPlugin.id,
          handler,
        },
      ];

      service.unregisterPluginHooks(mockPlugin.id);

      expect(service['_hooks'].taskAdd).toEqual([]);
    });
  });

  describe('registerHeaderButton', () => {
    it('should register a header button', async () => {
      service._setCurrentPlugin(mockPlugin);
      const button = {
        label: 'Test Button',
        icon: 'test-icon',
        onClick: jasmine.createSpy('onClick'),
      };

      await service.registerHeaderButton(button);

      const registeredButtons = service.headerButtons$.value;
      expect(registeredButtons.length).toBe(1);
      expect(registeredButtons[0]).toEqual(
        jasmine.objectContaining({
          label: 'Test Button',
          icon: 'test-icon',
          pluginId: mockPlugin.id,
        }),
      );
    });
  });

  describe('registerMenuEntry', () => {
    it('should register a menu entry', async () => {
      service._setCurrentPlugin(mockPlugin);
      const entry = {
        label: 'Test Menu',
        icon: 'test-icon',
        onClick: jasmine.createSpy('onClick'),
      };

      await service.registerMenuEntry(entry);

      const registeredEntries = service.menuEntries$.value;
      expect(registeredEntries.length).toBe(1);
      expect(registeredEntries[0]).toEqual(
        jasmine.objectContaining({
          label: 'Test Menu',
          icon: 'test-icon',
          pluginId: mockPlugin.id,
        }),
      );
    });
  });

  describe('registerSidePanelButton', () => {
    it('should register a side panel button', async () => {
      service._setCurrentPlugin(mockPlugin);
      const button = {
        label: 'Test Panel',
        icon: 'test-icon',
        onClick: jasmine.createSpy('onClick'),
      };

      await service.registerSidePanelButton(button);

      const registeredButtons = service.sidePanelButtons$.value;
      expect(registeredButtons.length).toBe(1);
      expect(registeredButtons[0]).toEqual(
        jasmine.objectContaining({
          label: 'Test Panel',
          icon: 'test-icon',
          pluginId: mockPlugin.id,
        }),
      );
    });
  });

  describe('registerShortcut', () => {
    it('should register a keyboard shortcut', async () => {
      service._setCurrentPlugin(mockPlugin);
      const shortcut = {
        keys: 'ctrl+shift+t',
        label: 'Test Shortcut',
        action: jasmine.createSpy('action'),
      };

      await service.registerShortcut(shortcut);

      expect(service['_pluginShortcuts'].get(mockPlugin.id)).toContain(
        jasmine.objectContaining({
          keys: 'ctrl+shift+t',
          label: 'Test Shortcut',
        }),
      );
    });
  });

  describe('executeShortcut', () => {
    it('should execute a registered shortcut', () => {
      service._setCurrentPlugin(mockPlugin);
      const action = jasmine.createSpy('action');
      service['_pluginShortcuts'].set(mockPlugin.id, [
        {
          keys: 'ctrl+shift+t',
          label: 'Test Shortcut',
          action,
        },
      ]);

      const result = service.executeShortcut('ctrl+shift+t');

      expect(action).toHaveBeenCalledWith({});
      expect(result).toBe(true);
    });

    it('should return false if shortcut not found', () => {
      const result = service.executeShortcut('ctrl+shift+x');
      expect(result).toBe(false);
    });
  });

  describe('executeNodeScript', () => {
    it('should execute node script in electron environment', async () => {
      service._setCurrentPlugin(mockPlugin);
      (window as any).IS_ELECTRON = true;
      electronService.execNodeScript.and.returnValue(
        Promise.resolve({ output: 'test output' }),
      );

      const result = await service.executeNodeScript('console.log("test")');

      expect(electronService.execNodeScript).toHaveBeenCalledWith('console.log("test")');
      expect(result).toEqual({ output: 'test output' });
    });

    it('should reject if not in electron environment', async () => {
      service._setCurrentPlugin(mockPlugin);
      (window as any).IS_ELECTRON = false;

      await expectAsync(
        service.executeNodeScript('console.log("test")'),
      ).toBeRejectedWithError(
        'pluginExecNodeScript is only available in the desktop version',
      );
    });
  });

  describe('sendMessageToPlugin', () => {
    it('should post message to plugin iframe', () => {
      service._setCurrentPlugin(mockPlugin);
      const iframe = document.createElement('iframe');
      spyOn(iframe.contentWindow as any, 'postMessage');
      spyOn(document, 'getElementById').and.returnValue(iframe);

      service.sendMessageToPlugin(mockPlugin.id, { type: 'test', data: 'message' });

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        { type: 'test', data: 'message' },
        '*',
      );
    });
  });

  describe('ngOnDestroy', () => {
    it('should clean up resources', () => {
      spyOn(service['_destroy$'], 'next');
      spyOn(service['_destroy$'], 'complete');

      service.ngOnDestroy();

      expect(service['_destroy$'].next).toHaveBeenCalled();
      expect(service['_destroy$'].complete).toHaveBeenCalled();
    });
  });
});
