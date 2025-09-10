import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { AddTaskBarComponent } from './add-task-bar.component';
import { TaskService } from '../task.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { ProjectService } from '../../project/project.service';
import { TagService } from '../../tag/tag.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { AddTaskBarIssueSearchService } from './add-task-bar-issue-search.service';
import { SnackService } from '../../../core/snack/snack.service';
import { WorkContextType } from '../../work-context/work-context.model';
import { Project } from '../../project/project.model';
import { WorkContext } from '../../work-context/work-context.model';
import { MiscConfig } from '../../config/global-config.model';
import { first } from 'rxjs/operators';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AddTaskBarComponent', () => {
  let component: AddTaskBarComponent;
  let fixture: ComponentFixture<AddTaskBarComponent>;
  let mockTaskService: jasmine.SpyObj<TaskService>;
  let mockWorkContextService: jasmine.SpyObj<WorkContextService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockTagService: jasmine.SpyObj<TagService>;
  let mockGlobalConfigService: jasmine.SpyObj<GlobalConfigService>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackService: jasmine.SpyObj<SnackService>;
  let mockAddTaskBarIssueSearchService: jasmine.SpyObj<AddTaskBarIssueSearchService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  // Mock data
  const mockProjects: Project[] = [
    {
      id: 'INBOX_PROJECT',
      title: 'Inbox',
      isArchived: false,
      isHiddenFromMenu: false,
    } as Project,
    {
      id: 'project-1',
      title: 'Project 1',
      isArchived: false,
      isHiddenFromMenu: false,
    } as Project,
    {
      id: 'project-2',
      title: 'Project 2',
      isArchived: false,
      isHiddenFromMenu: false,
    } as Project,
    {
      id: 'default-project',
      title: 'Default Project',
      isArchived: false,
      isHiddenFromMenu: false,
    } as Project,
  ];

  const mockProjectWorkContext: WorkContext = {
    id: 'project-1',
    title: 'Project 1',
    type: WorkContextType.PROJECT,
  } as WorkContext;

  const mockTagWorkContext: WorkContext = {
    id: 'TODAY',
    title: 'Today',
    type: WorkContextType.TAG,
  } as WorkContext;

  const mockMiscConfig: MiscConfig = {
    defaultProjectId: null,
    isAutMarkParentAsDone: false,
    isConfirmBeforeExit: false,
    isConfirmBeforeExitWithoutFinishDay: false,
    isTurnOffMarkdown: false,
    isAutoAddWorkedOnToToday: false,
    isMinimizeToTray: false,
    isTrayShowCurrentTask: false,
    firstDayOfWeek: 1,
    startOfNextDay: 4,
    taskNotesTpl: '',
    isDisableAnimations: false,
  };

  beforeEach(async () => {
    // Create spies
    mockTaskService = jasmine.createSpyObj('TaskService', [
      'add',
      'getByIdOnce$',
      'scheduleTask',
    ]);
    mockWorkContextService = jasmine.createSpyObj('WorkContextService', [], {
      activeWorkContext$: new BehaviorSubject<WorkContext | null>(null),
    });
    mockProjectService = jasmine.createSpyObj('ProjectService', [], {
      list$: of(mockProjects),
    });
    mockTagService = jasmine.createSpyObj('TagService', [], {
      tags$: of([]),
      tagsNoMyDayAndNoList$: of([]),
    });
    mockGlobalConfigService = jasmine.createSpyObj('GlobalConfigService', [], {
      misc$: new BehaviorSubject<MiscConfig>(mockMiscConfig),
      shortSyntax$: of({}),
    });
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockSnackService = jasmine.createSpyObj('SnackService', ['open']);
    mockAddTaskBarIssueSearchService = jasmine.createSpyObj(
      'AddTaskBarIssueSearchService',
      ['getFilteredIssueSuggestions$', 'addTaskFromExistingTaskOrIssue'],
    );
    mockTranslateService = jasmine.createSpyObj('TranslateService', ['instant']);

    // Setup method returns
    mockAddTaskBarIssueSearchService.getFilteredIssueSuggestions$.and.returnValue(of([]));
    mockTranslateService.instant.and.returnValue('Test message');

    await TestBed.configureTestingModule({
      imports: [AddTaskBarComponent, NoopAnimationsModule],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: WorkContextService, useValue: mockWorkContextService },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: TagService, useValue: mockTagService },
        { provide: GlobalConfigService, useValue: mockGlobalConfigService },
        { provide: Store, useValue: mockStore },
        { provide: MatDialog, useValue: mockMatDialog },
        { provide: SnackService, useValue: mockSnackService },
        {
          provide: AddTaskBarIssueSearchService,
          useValue: mockAddTaskBarIssueSearchService,
        },
        { provide: TranslateService, useValue: mockTranslateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTaskBarComponent);
    component = fixture.componentInstance;
  });

  describe('defaultProject$ observable', () => {
    it('should return current project when in project work context', async () => {
      // Set project work context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockProjectWorkContext);

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      expect(defaultProject?.id).toBe('project-1');
      expect(defaultProject?.title).toBe('Project 1');
    });

    it('should return configured default project when in tag context and defaultProjectId is set', async () => {
      // Set tag work context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockTagWorkContext);

      // Set default project in config
      const configWithDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: 'default-project',
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithDefault,
      );

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      expect(defaultProject?.id).toBe('default-project');
      expect(defaultProject?.title).toBe('Default Project');
    });

    it('should return INBOX_PROJECT when in tag context and no defaultProjectId configured', async () => {
      // Set tag work context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockTagWorkContext);

      // Ensure no default project is configured
      const configWithoutDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: null,
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithoutDefault,
      );

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      expect(defaultProject?.id).toBe('INBOX_PROJECT');
      expect(defaultProject?.title).toBe('Inbox');
    });

    it('should return INBOX_PROJECT when in tag context and defaultProjectId is false', async () => {
      // Set tag work context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockTagWorkContext);

      // Set defaultProjectId to false
      const configWithFalseDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: false,
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithFalseDefault,
      );

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      expect(defaultProject?.id).toBe('INBOX_PROJECT');
      expect(defaultProject?.title).toBe('Inbox');
    });

    it('should return INBOX_PROJECT when configured defaultProjectId does not exist in projects', async () => {
      // Set tag work context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockTagWorkContext);

      // Set a non-existent default project
      const configWithNonExistentDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: 'non-existent-project',
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithNonExistentDefault,
      );

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      expect(defaultProject?.id).toBe('INBOX_PROJECT');
      expect(defaultProject?.title).toBe('Inbox');
    });

    it('should prioritize project context over default project setting', async () => {
      // Set project work context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockProjectWorkContext);

      // Set a different default project in config
      const configWithDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: 'default-project',
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithDefault,
      );

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      // Should return the project from context, not the configured default
      expect(defaultProject?.id).toBe('project-1');
      expect(defaultProject?.title).toBe('Project 1');
    });

    it('should react to changes in work context', async () => {
      // Start with tag context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockTagWorkContext);

      // Set default project
      const configWithDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: 'default-project',
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithDefault,
      );

      let defaultProject = await component.defaultProject$.pipe(first()).toPromise();
      expect(defaultProject?.id).toBe('default-project');

      // Switch to project context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockProjectWorkContext);

      defaultProject = await component.defaultProject$.pipe(first()).toPromise();
      expect(defaultProject?.id).toBe('project-1');
    });

    it('should react to changes in default project configuration', async () => {
      // Set tag context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockTagWorkContext);

      // Start with no default project
      const configWithoutDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: null,
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithoutDefault,
      );

      let defaultProject = await component.defaultProject$.pipe(first()).toPromise();
      expect(defaultProject?.id).toBe('INBOX_PROJECT');

      // Change to configured default project
      const configWithDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: 'default-project',
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithDefault,
      );

      defaultProject = await component.defaultProject$.pipe(first()).toPromise();
      expect(defaultProject?.id).toBe('default-project');
    });

    it('should handle null work context gracefully', async () => {
      // Set null work context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(null);

      // Set default project
      const configWithDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: 'default-project',
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithDefault,
      );

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      expect(defaultProject?.id).toBe('default-project');
    });

    it('should handle empty projects list gracefully', async () => {
      // Re-create the component with empty projects list
      await TestBed.configureTestingModule({
        imports: [AddTaskBarComponent, NoopAnimationsModule],
        providers: [
          { provide: TaskService, useValue: mockTaskService },
          { provide: WorkContextService, useValue: mockWorkContextService },
          { provide: ProjectService, useValue: { ...mockProjectService, list$: of([]) } },
          { provide: TagService, useValue: mockTagService },
          { provide: GlobalConfigService, useValue: mockGlobalConfigService },
          { provide: Store, useValue: mockStore },
          { provide: MatDialog, useValue: mockMatDialog },
          { provide: SnackService, useValue: mockSnackService },
          {
            provide: AddTaskBarIssueSearchService,
            useValue: mockAddTaskBarIssueSearchService,
          },
          { provide: TranslateService, useValue: mockTranslateService },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(AddTaskBarComponent);
      component = fixture.componentInstance;

      // Set tag context
      (
        mockWorkContextService.activeWorkContext$ as BehaviorSubject<WorkContext | null>
      ).next(mockTagWorkContext);

      const configWithDefault: MiscConfig = {
        ...mockMiscConfig,
        defaultProjectId: 'default-project',
      };
      (mockGlobalConfigService.misc$ as BehaviorSubject<MiscConfig>).next(
        configWithDefault,
      );

      const defaultProject = await component.defaultProject$.pipe(first()).toPromise();

      expect(defaultProject).toBeUndefined();
    });
  });
});
