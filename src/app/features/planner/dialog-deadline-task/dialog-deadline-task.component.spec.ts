import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogDeadlineTaskComponent } from './dialog-deadline-task.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { SnackService } from '../../../core/snack/snack.service';
import { DatePipe } from '@angular/common';
import { TaskService } from '../../../features/tasks/task.service';
import { WorkContextService } from '../../../features/work-context/work-context.service';
import { of } from 'rxjs';
import { TaskCopy } from '../../tasks/task.model';

describe('DialogDeadlineTaskComponent', () => {
  let component: DialogDeadlineTaskComponent;
  let fixture: ComponentFixture<DialogDeadlineTaskComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<DialogDeadlineTaskComponent>>;
  let snackServiceSpy: jasmine.SpyObj<SnackService>;
  let taskServiceSpy: jasmine.SpyObj<TaskService>;
  let workContextServiceSpy: jasmine.SpyObj<WorkContextService>;

  const mockDialogData = {
    taskId: 'task123',
    title: 'Test Task',
    date: new Date(),
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackServiceSpy = jasmine.createSpyObj('SnackService', ['open']);
    taskServiceSpy = jasmine.createSpyObj('TaskService', ['update']);
    workContextServiceSpy = jasmine.createSpyObj(
      'WorkContextService',
      ['activeWorkContextId$'],
      {
        activeWorkContextId$: of('someWorkContextId'),
      },
    );

    await TestBed.configureTestingModule({
      imports: [
        DialogDeadlineTaskComponent,
        MatDialogModule,
        ReactiveFormsModule,
        FormsModule,
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: SnackService, useValue: snackServiceSpy },
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: WorkContextService, useValue: workContextServiceSpy },
        TranslateService,
        TranslateStore,
        DatePipe,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogDeadlineTaskComponent);
    component = fixture.componentInstance;
    const t = {
      id: 'task123',
      title: 'Test Task',
      tagIds: [] as string[],
      projectId: 'DEFAULT',
      timeSpentOnDay: {},
      attachments: [],
      timeEstimate: 0,
      timeSpent: 0,
      isDone: false,
      created: Date.now(),
      subTaskIds: [],
    } as TaskCopy;
    component.data = {
      task: t,
    };
    component.task = t;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with form data when submit is clicked', async () => {
    const testDate = new Date('2023-05-15');
    component.selectedDate = testDate;
    await component.submit();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  describe('submit()', () => {
    it('should call taskService.update with correct parameters when submit is called', async () => {
      const testDate = '2023-06-01';
      const expectedDate = testDate;

      const mockTask = {
        id: 'task123',
        title: 'Test Task',
        tagIds: [] as string[],
        projectId: 'DEFAULT',
        timeSpentOnDay: {},
        attachments: [],
        timeEstimate: 0,
        timeSpent: 0,
        isDone: false,
        created: 1640995200000, // Fixed timestamp
        subTaskIds: [],
      } as TaskCopy;

      component.selectedDate = testDate;
      component.task = mockTask;
      await component.submit();

      expect(taskServiceSpy.update).toHaveBeenCalledWith(
        'task123',
        jasmine.objectContaining({
          deadline: expectedDate,
        }),
      );
    });

    it('should not update task and close dialog if no date is selected', async () => {
      component.selectedDate = undefined as any;
      await component.submit();
      expect(taskServiceSpy.update).not.toHaveBeenCalled();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('should handle when update throws (should not close dialog)', async () => {
      const testDate = '2023-12-01';
      component.selectedDate = testDate;
      component.task = {
        id: 'taskThrow',
        title: 'Throw Task',
        tagIds: [] as string[],
        projectId: 'DEFAULT',
        timeSpentOnDay: {},
        attachments: [],
        timeEstimate: 0,
        timeSpent: 0,
        isDone: false,
        created: 1640995200000, // Fixed timestamp
        subTaskIds: [],
      } as TaskCopy;
      taskServiceSpy.update.and.throwError('Update failed');
      try {
        await component.submit();
      } catch {}
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
      expect(snackServiceSpy.open).not.toHaveBeenCalled();
    });

    it('should close dialog with true when updating is successful', async () => {
      const testDate = '2024-01-01';
      component.selectedDate = testDate;
      component.task = {
        id: 'taskClose',
        title: 'Close Task',
        tagIds: [] as string[],
        projectId: 'DEFAULT',
        timeSpentOnDay: {},
        attachments: [],
        timeEstimate: 0,
        timeSpent: 0,
        isDone: false,
        created: 1640995200000, // Fixed timestamp
        subTaskIds: [],
      } as TaskCopy;
      await component.submit();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    it('should not call snackService.open if update fails', async () => {
      const testDate = '2024-02-01';
      component.selectedDate = testDate;
      component.task = {
        id: 'taskNoSnack',
        title: 'No Snack Task',
        tagIds: [] as string[],
        projectId: 'DEFAULT',
        timeSpentOnDay: {},
        attachments: [],
        timeEstimate: 0,
        timeSpent: 0,
        isDone: false,
        created: 1640995200000, // Fixed timestamp
        subTaskIds: [],
      } as TaskCopy;
      taskServiceSpy.update.and.throwError('Error');
      try {
        await component.submit();
      } catch {}
      expect(snackServiceSpy.open).not.toHaveBeenCalled();
    });
  });
});
