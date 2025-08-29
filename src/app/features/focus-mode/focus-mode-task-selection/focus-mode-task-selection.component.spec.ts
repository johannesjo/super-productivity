import { FocusModeTaskSelectionComponent } from './focus-mode-task-selection.component';
import {
  setFocusSessionActivePage,
  startFocusSession,
} from '../store/focus-mode.actions';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';
import { Task } from '../../tasks/task.model';
import { signal } from '@angular/core';

describe('FocusModeTaskSelectionComponent - onSubmit method', () => {
  let component: FocusModeTaskSelectionComponent;
  let mockTaskService: jasmine.SpyObj<any>;
  let mockStore: jasmine.SpyObj<any>;

  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    isDone: false,
    created: Date.now(),
    timeEstimate: 0,
    timeSpent: 0,
    projectId: 'project-1',
    subTaskIds: [],
    tagIds: [],
    notes: '',
    timeSpentOnDay: {},
    attachments: [],
  };

  beforeEach(() => {
    // Create spies for dependencies
    mockTaskService = jasmine.createSpyObj('TaskService', ['add', 'setCurrentId']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    // Create component instance manually
    component = Object.create(FocusModeTaskSelectionComponent.prototype);

    // Inject mock dependencies
    (component as any).taskService = mockTaskService;
    (component as any)._store = mockStore;

    // Mock signals with default values
    (component as any).mode = signal(FocusModeMode.Flowtime);
    (component as any).cfg = signal({ isSkipPreparation: false });
  });

  describe('onSubmit', () => {
    let mockEvent: jasmine.SpyObj<SubmitEvent>;

    beforeEach(() => {
      mockEvent = jasmine.createSpyObj('SubmitEvent', ['preventDefault']);
    });

    it('should prevent default event', () => {
      component.selectedTask = 'new task';
      component.onSubmit(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should do nothing if no task is selected', () => {
      component.selectedTask = undefined;
      component.onSubmit(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockTaskService.add).not.toHaveBeenCalled();
      expect(mockTaskService.setCurrentId).not.toHaveBeenCalled();
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    describe('when selectedTask is a string (new task)', () => {
      beforeEach(() => {
        mockTaskService.add.and.returnValue('new-task-id');
      });

      it('should create and set current task in Flowtime mode with skip preparation', () => {
        // Setup: Flowtime mode with skip preparation enabled
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: true });

        component.selectedTask = 'New Task Title';
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).toHaveBeenCalledWith('New Task Title');
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('new-task-id');
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
        );
        expect(mockStore.dispatch).toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
      });

      it('should create task and go to preparation in Flowtime mode without skip preparation', () => {
        // Setup: Flowtime mode with skip preparation disabled
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: false });

        component.selectedTask = 'New Task Title';
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).toHaveBeenCalledWith('New Task Title');
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('new-task-id');
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.Preparation }),
        );
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should create task and go to duration selection in Pomodoro mode', () => {
        // Setup: Pomodoro mode
        (component as any).mode = signal(FocusModeMode.Pomodoro);
        (component as any).cfg = signal({ isSkipPreparation: false });

        component.selectedTask = 'New Task Title';
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).toHaveBeenCalledWith('New Task Title');
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('new-task-id');
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
        );
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should handle undefined config gracefully in Flowtime mode', () => {
        // Setup: Flowtime mode with undefined config
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal(undefined);

        component.selectedTask = 'New Task Title';
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).toHaveBeenCalledWith('New Task Title');
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('new-task-id');
        // Should default to Preparation when config is undefined (falsy check)
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.Preparation }),
        );
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      });
    });

    describe('when selectedTask is an existing Task object', () => {
      it('should set current task in Flowtime mode with skip preparation', () => {
        // Setup: Flowtime mode with skip preparation enabled
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: true });

        component.selectedTask = mockTask;
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).not.toHaveBeenCalled();
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('task-1');
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
        );
        expect(mockStore.dispatch).toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
      });

      it('should set current task and go to preparation in Flowtime mode without skip preparation', () => {
        // Setup: Flowtime mode with skip preparation disabled
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: false });

        component.selectedTask = mockTask;
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).not.toHaveBeenCalled();
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('task-1');
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.Preparation }),
        );
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should set current task and go to duration selection in Pomodoro mode', () => {
        // Setup: Pomodoro mode
        (component as any).mode = signal(FocusModeMode.Pomodoro);
        (component as any).cfg = signal({ isSkipPreparation: false });

        component.selectedTask = mockTask;
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).not.toHaveBeenCalled();
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('task-1');
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
        );
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      });

      it('should set current task and go to duration selection in Countdown mode', () => {
        // Setup: Countdown mode
        (component as any).mode = signal(FocusModeMode.Countdown);
        (component as any).cfg = signal({ isSkipPreparation: false });

        component.selectedTask = mockTask;
        component.onSubmit(mockEvent);

        expect(mockTaskService.add).not.toHaveBeenCalled();
        expect(mockTaskService.setCurrentId).toHaveBeenCalledWith('task-1');
        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
        );
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(startFocusSession());
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
      });
    });

    describe('Focus mode decision logic', () => {
      beforeEach(() => {
        mockTaskService.add.and.returnValue('new-task-id');
      });

      it('should determine focusActivePage correctly for Flowtime with skip preparation', () => {
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: true });
        component.selectedTask = 'Test Task';

        component.onSubmit(mockEvent);

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.Main }),
        );
      });

      it('should determine focusActivePage correctly for Flowtime without skip preparation', () => {
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: false });
        component.selectedTask = 'Test Task';

        component.onSubmit(mockEvent);

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.Preparation }),
        );
      });

      it('should determine focusActivePage correctly for non-Flowtime modes', () => {
        (component as any).mode = signal(FocusModeMode.Pomodoro);
        (component as any).cfg = signal({ isSkipPreparation: true }); // Should be ignored
        component.selectedTask = 'Test Task';

        component.onSubmit(mockEvent);

        expect(mockStore.dispatch).toHaveBeenCalledWith(
          setFocusSessionActivePage({ focusActivePage: FocusModePage.DurationSelection }),
        );
      });

      it('should start focus session only when focusActivePage is Main', () => {
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: true });
        component.selectedTask = 'Test Task';

        component.onSubmit(mockEvent);

        // Should dispatch both setFocusSessionActivePage and startFocusSession
        expect(mockStore.dispatch).toHaveBeenCalledWith(startFocusSession());
      });

      it('should NOT start focus session when focusActivePage is not Main', () => {
        (component as any).mode = signal(FocusModeMode.Flowtime);
        (component as any).cfg = signal({ isSkipPreparation: false });
        component.selectedTask = 'Test Task';

        component.onSubmit(mockEvent);

        // Should NOT dispatch startFocusSession
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(startFocusSession());
      });
    });
  });
});
