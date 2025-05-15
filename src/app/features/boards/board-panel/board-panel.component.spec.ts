import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardPanelComponent } from './board-panel.component';
import { BoardPanelCfg, BoardPanelCfgTaskTypeFilter } from '../boards.model';
import { TaskCopy } from '../../tasks/task.model';
import { Store } from '@ngrx/store';
import { TaskService } from '../../tasks/task.service';
import { MatDialog } from '@angular/material/dialog';
import { of, ReplaySubject } from 'rxjs';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateFakeLoader } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { PlannerTaskComponent } from '../../planner/planner-task/planner-task.component';
import { AddTaskInlineComponent } from '../../planner/add-task-inline/add-task-inline.component';
import { selectUnarchivedVisibleProjects } from '../../project/store/project.selectors';
import { selectAllTasksWithoutHiddenProjects } from '../../tasks/store/task.selectors';
import { WorkContextService } from '../../work-context/work-context.service';
import { ProjectService } from '../../project/project.service';

describe('BoardPanelComponent - Backlog Feature', () => {
  let component: BoardPanelComponent;
  let fixture: ComponentFixture<BoardPanelComponent>;
  let actions$: ReplaySubject<any>;

  const mockBacklogTaskId = 'backlog-task-1';
  const mockNonBacklogTaskId = 'regular-task-1';

  const mockPanelCfg: Partial<BoardPanelCfg> = {
    id: 'panel-1',
    title: 'Backlog Panel',
    taskIds: [mockBacklogTaskId, mockNonBacklogTaskId],
    backlogState: BoardPanelCfgTaskTypeFilter.OnlyBacklog,
    includedTagIds: [],
    excludedTagIds: [],
    isParentTasksOnly: false,
    projectId: undefined,
  };

  const mockTasks: TaskCopy[] = [
    {
      id: mockBacklogTaskId,
      title: 'Backlog Task',
      projectId: 'p1',
    } as TaskCopy,
    {
      id: mockNonBacklogTaskId,
      title: 'Regular Task',
      projectId: 'p1',
    } as TaskCopy,
  ];

  const mockProjects = [
    { id: 'p1', backlogTaskIds: [mockBacklogTaskId] },
    { id: 'p2', backlogTaskIds: [] },
  ];

  beforeEach(async () => {
    actions$ = new ReplaySubject(1);

    const storeMock = {
      select: (selectorFn: any) => {
        if (selectorFn === selectUnarchivedVisibleProjects) {
          return of(mockProjects);
        } else if (selectorFn === selectAllTasksWithoutHiddenProjects) {
          return of(mockTasks);
        }
        return of([]);
      },
      dispatch: jasmine.createSpy('dispatch'),
    };

    const workContextServiceMock = {};

    const projectServiceMock = {
      getProjectsWithoutId$: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [
        BoardPanelComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateFakeLoader },
        }),
      ],
      providers: [
        provideMockStore({}),
        provideMockActions(() => actions$),
        { provide: Store, useValue: storeMock },
        { provide: TaskService, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: WorkContextService, useValue: workContextServiceMock },
        { provide: ProjectService, useValue: projectServiceMock },
      ],
    })
      .overrideComponent(PlannerTaskComponent, {
        set: {
          template: '<div>Mock Task</div>',
          inputs: ['task'],
        },
      })
      .overrideComponent(AddTaskInlineComponent, {
        set: {
          template: '<div>Mock Add Task</div>',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BoardPanelComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('panelCfg', mockPanelCfg as BoardPanelCfg);
    fixture.detectChanges();
  });

  it('should only include backlog tasks when filterType is OnlyBacklog', () => {
    fixture.componentRef.setInput('panelCfg', {
      ...mockPanelCfg,
      backlogState: BoardPanelCfgTaskTypeFilter.OnlyBacklog,
    } as BoardPanelCfg);
    fixture.detectChanges();
    const tasks = component.tasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(mockBacklogTaskId);
  });

  it('should exclude backlog tasks when filterType is NoBacklog', () => {
    fixture.componentRef.setInput('panelCfg', {
      ...mockPanelCfg,
      backlogState: BoardPanelCfgTaskTypeFilter.NoBacklog,
    } as BoardPanelCfg);
    fixture.detectChanges();
    const tasks = component.tasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(mockNonBacklogTaskId);
  });

  it('should include all tasks regardless of backlog when filterType is All', () => {
    fixture.componentRef.setInput('panelCfg', {
      ...mockPanelCfg,
      backlogState: BoardPanelCfgTaskTypeFilter.All,
    } as BoardPanelCfg);
    fixture.detectChanges();
    const tasks = component.tasks();
    expect(tasks.length).toBe(2);
    expect(tasks.find((t) => t.id === mockBacklogTaskId)).toBeTruthy();
    expect(tasks.find((t) => t.id === mockNonBacklogTaskId)).toBeTruthy();
  });
});
