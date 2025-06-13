// import { TestBed } from '@angular/core/testing';
// import { AddTasksForTomorrowService } from './add-tasks-for-tomorrow.service';
// import { Store } from '@ngrx/store';
// import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
// import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
// import { BehaviorSubject, of } from 'rxjs';
// import { provideMockStore, MockStore } from '@ngrx/store/testing';
// import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
// import { TaskWithDueTime, TaskWithDueDay, TaskCopy } from '../tasks/task.model';
// import { planTasksForToday } from '../tag/store/tag.actions';
// import {
//   selectTasksDueForDay,
//   selectTasksWithDueTimeForRange,
// } from '../tasks/store/task.selectors';
// import { selectTodayTaskIds } from '../work-context/store/work-context.selectors';
// import { selectTasksForPlannerDay } from '../planner/store/planner.selectors';
// import { getWorklogStr } from '../../util/get-work-log-str';
//
// describe('AddTasksForTomorrowService', () => {
//   let service: AddTasksForTomorrowService;
//   let store: MockStore;
//   let taskRepeatCfgServiceMock: jasmine.SpyObj<TaskRepeatCfgService>;
//   let globalTrackingIntervalServiceMock: any;
//
//   // Sample test data
//   const today = new Date();
//   const todayStr = today.toISOString().split('T')[0];
//
//   const tomorrow = new Date(today);
//   tomorrow.setDate(tomorrow.getDate() + 1);
//   const tomorrowStr = tomorrow.toISOString().split('T')[0];
//
//   const mockTaskWithDueTimeTomorrow: TaskWithDueTime = {
//     id: 'task1',
//     title: 'Task with due time',
//     tagIds: [],
//     projectId: 'project1',
//     subTaskIds: [],
//     timeSpentOnDay: {},
//     timeEstimate: 0,
//     timeSpent: 0,
//     created: Date.now(),
//     isDone: false,
//     attachments: [],
//     // eslint-disable-next-line no-mixed-operators
//     dueWithTime: tomorrow.getTime() + 1000 * 60 * 60 * 14, // 2 PM tomorrow
//   } as TaskWithDueTime;
//
//   const mockTaskWithDueDayTomorrow: TaskWithDueDay = {
//     id: 'task2',
//     title: 'Task with due day',
//     tagIds: [],
//     projectId: 'project1',
//     subTaskIds: [],
//     timeSpentOnDay: {},
//     timeEstimate: 0,
//     timeSpent: 0,
//     created: Date.now(),
//     isDone: false,
//     attachments: [],
//     dueDay: tomorrowStr,
//   } as TaskWithDueDay;
//
//   const mockTaskWithDueTimeToday: TaskWithDueTime = {
//     id: 'task3',
//     title: 'Task with due time today',
//     tagIds: [],
//     projectId: 'project1',
//     subTaskIds: [],
//     timeSpentOnDay: {},
//     timeEstimate: 0,
//     timeSpent: 0,
//     created: Date.now(),
//     isDone: false,
//     attachments: [],
//     // eslint-disable-next-line no-mixed-operators
//     dueWithTime: today.getTime() + 1000 * 60 * 60 * 16, // 4 PM today
//   } as TaskWithDueTime;
//
//   const mockTaskWithDueDayToday: TaskWithDueDay = {
//     id: 'task4',
//     title: 'Task with due day today',
//     tagIds: [],
//     projectId: 'project1',
//     subTaskIds: [],
//     timeSpentOnDay: {},
//     timeEstimate: 0,
//     timeSpent: 0,
//     created: Date.now(),
//     isDone: false,
//     attachments: [],
//     dueDay: getWorklogStr(today),
//   } as TaskWithDueDay;
//
//   const mockRepeatCfg: TaskRepeatCfg = {
//     id: 'repeat1',
//     title: 'Repeatable task',
//     projectId: 'project1',
//     lastTaskCreation: 0,
//     tagIds: [],
//     order: 0,
//     isPaused: false,
//     quickSetting: 'DAILY',
//     repeatCycle: 'DAILY',
//     repeatEvery: 1,
//     notes: undefined,
//   } as TaskRepeatCfg;
//
//   const mockRepeatCfg2: TaskRepeatCfg = {
//     id: 'repeat2',
//     title: 'Another Repeatable task',
//     projectId: 'project1',
//     lastTaskCreation: 0,
//     tagIds: [],
//     order: 1,
//     isPaused: false,
//     quickSetting: 'DAILY',
//     repeatCycle: 'DAILY',
//     repeatEvery: 1,
//     notes: undefined,
//   } as TaskRepeatCfg;
//
//   // Setup before each test
//   beforeEach(() => {
//     taskRepeatCfgServiceMock = jasmine.createSpyObj('TaskRepeatCfgService', [
//       'getRepeatableTasksDueForDayOnly$',
//       'createRepeatableTask',
//     ]);
//
//     // Create behavior subjects to simulate observables
//     const todayDateStr$ = new BehaviorSubject<string>(todayStr);
//
//     globalTrackingIntervalServiceMock = {
//       todayDateStr$: todayDateStr$,
//     };
//
//     // Configure mock return values
//     taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//     taskRepeatCfgServiceMock.createRepeatableTask.and.returnValue(Promise.resolve());
//
//     TestBed.configureTestingModule({
//       providers: [
//         AddTasksForTomorrowService,
//         { provide: TaskRepeatCfgService, useValue: taskRepeatCfgServiceMock },
//         {
//           provide: GlobalTrackingIntervalService,
//           useValue: globalTrackingIntervalServiceMock,
//         },
//         provideMockStore({
//           initialState: {
//             planner: {
//               days: {},
//             },
//           },
//         }),
//       ],
//     });
//
//     service = TestBed.inject(AddTasksForTomorrowService);
//     store = TestBed.inject(Store) as MockStore;
//   });
//
//   it('should be created', () => {
//     expect(service).toBeTruthy();
//   });
//
//   describe('nrOfPlannerItemsForTomorrow$', () => {
//     it('should count repeatable tasks due tomorrow', (done) => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(
//         of([mockRepeatCfg, mockRepeatCfg2]),
//       );
//       store.overrideSelector(selectTasksWithDueTimeForRange, []);
//       store.overrideSelector(selectTasksDueForDay, []);
//       store.overrideSelector(selectTodayTaskIds, []);
//
//       service.nrOfPlannerItemsForTomorrow$.subscribe((count) => {
//         expect(count).toBe(2);
//         done();
//       });
//     });
//
//     it('should count tasks with due time tomorrow', (done) => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//       store.overrideSelector(selectTasksWithDueTimeForRange, [
//         mockTaskWithDueTimeTomorrow,
//       ]);
//       store.overrideSelector(selectTasksDueForDay, []);
//       store.overrideSelector(selectTodayTaskIds, []);
//
//       service.nrOfPlannerItemsForTomorrow$.subscribe((count) => {
//         expect(count).toBe(1);
//         done();
//       });
//     });
//
//     it('should count tasks with due day tomorrow', (done) => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//       store.overrideSelector(selectTasksWithDueTimeForRange, []);
//       store.overrideSelector(selectTasksDueForDay, [mockTaskWithDueDayTomorrow]);
//       store.overrideSelector(selectTodayTaskIds, []);
//
//       service.nrOfPlannerItemsForTomorrow$.subscribe((count) => {
//         expect(count).toBe(1);
//         done();
//       });
//     });
//
//     it('should exclude tasks that are already in today list', (done) => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//       store.overrideSelector(selectTasksWithDueTimeForRange, [
//         mockTaskWithDueTimeTomorrow,
//       ]);
//       store.overrideSelector(selectTasksDueForDay, [mockTaskWithDueDayTomorrow]);
//       store.overrideSelector(selectTodayTaskIds, ['task1']); // task1 is already in today
//
//       service.nrOfPlannerItemsForTomorrow$.subscribe((count) => {
//         expect(count).toBe(1); // Only task2 should be counted
//         done();
//       });
//     });
//
//     it('should count all types of tasks combined', (done) => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(
//         of([mockRepeatCfg]),
//       );
//       store.overrideSelector(selectTasksWithDueTimeForRange, [
//         mockTaskWithDueTimeTomorrow,
//       ]);
//       store.overrideSelector(selectTasksDueForDay, [mockTaskWithDueDayTomorrow]);
//       store.overrideSelector(selectTodayTaskIds, []);
//
//       service.nrOfPlannerItemsForTomorrow$.subscribe((count) => {
//         expect(count).toBe(3); // 1 repeat + 1 due time + 1 due day
//         done();
//       });
//     });
//   });
//
//   describe('addAllDueTomorrow()', () => {
//     it('should create repeatable tasks for tomorrow but not dispatch if no tasks to move', async () => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(
//         of([mockRepeatCfg, mockRepeatCfg2]),
//       );
//
//       store.overrideSelector(selectTasksWithDueTimeForRange, []);
//       store.overrideSelector(selectTasksDueForDay, []);
//       // Empty planner day means no tasks to move to today
//       store.overrideSelector(
//         selectTasksForPlannerDay(getWorklogStr(tomorrow.getTime())),
//         [],
//       );
//       store.overrideSelector(selectTodayTaskIds, []);
//       const dispatchSpy = spyOn(store, 'dispatch');
//
//       const result = await service.addAllDueTomorrow();
//
//       expect(taskRepeatCfgServiceMock.createRepeatableTask).toHaveBeenCalledTimes(2);
//       expect(taskRepeatCfgServiceMock.createRepeatableTask).toHaveBeenCalledWith(
//         mockRepeatCfg,
//         jasmine.any(Number),
//       );
//       expect(taskRepeatCfgServiceMock.createRepeatableTask).toHaveBeenCalledWith(
//         mockRepeatCfg2,
//         jasmine.any(Number),
//       );
//       // No dispatch since no tasks to move
//       expect(dispatchSpy).not.toHaveBeenCalled();
//       expect(result).toBeUndefined();
//     });
//
//     it('should add due tasks to today', async () => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//       store.overrideSelector(selectTasksWithDueTimeForRange, [
//         mockTaskWithDueTimeTomorrow,
//       ]);
//       store.overrideSelector(selectTasksDueForDay, [mockTaskWithDueDayTomorrow]);
//       store.overrideSelector(
//         selectTasksForPlannerDay(getWorklogStr(tomorrow.getTime())),
//         [mockTaskWithDueTimeTomorrow, mockTaskWithDueDayTomorrow],
//       );
//       store.overrideSelector(selectTodayTaskIds, []);
//       const dispatchSpy = spyOn(store, 'dispatch');
//
//       const result = await service.addAllDueTomorrow();
//
//       // The service may order tasks differently based on the sorting algorithm
//       expect(dispatchSpy).toHaveBeenCalled();
//       const actualCall = dispatchSpy.calls.first().args[0] as any;
//       expect(actualCall.type).toBe('[Tag] Plan tasks for Today');
//       expect(actualCall.isSkipRemoveReminder).toBe(true);
//       expect(actualCall.taskIds.length).toBe(2);
//       expect(actualCall.taskIds).toContain('task1');
//       expect(actualCall.taskIds).toContain('task2');
//       expect(result).toBe('ADDED');
//     });
//
//     it('should not dispatch action when no tasks due', async () => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//       store.overrideSelector(selectTasksWithDueTimeForRange, []);
//       store.overrideSelector(selectTasksDueForDay, []);
//       store.overrideSelector(
//         selectTasksForPlannerDay(getWorklogStr(tomorrow.getTime())),
//         [],
//       );
//       store.overrideSelector(selectTodayTaskIds, []);
//       const dispatchSpy = spyOn(store, 'dispatch');
//
//       const result = await service.addAllDueTomorrow();
//
//       expect(dispatchSpy).not.toHaveBeenCalled();
//       expect(result).toBeUndefined();
//     });
//
//     it('should filter out tasks already in today list', async () => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//       store.overrideSelector(selectTasksWithDueTimeForRange, [
//         mockTaskWithDueTimeTomorrow,
//       ]);
//       store.overrideSelector(selectTasksDueForDay, [mockTaskWithDueDayTomorrow]);
//       store.overrideSelector(
//         selectTasksForPlannerDay(getWorklogStr(tomorrow.getTime())),
//         [mockTaskWithDueTimeTomorrow, mockTaskWithDueDayTomorrow],
//       );
//       store.overrideSelector(selectTodayTaskIds, ['task1']); // task1 already in today
//       const dispatchSpy = spyOn(store, 'dispatch');
//
//       const result = await service.addAllDueTomorrow();
//
//       expect(dispatchSpy).toHaveBeenCalledWith(
//         planTasksForToday({
//           taskIds: ['task2'], // Only task2
//           isSkipRemoveReminder: true,
//         }),
//       );
//       expect(result).toBe('ADDED');
//     });
//   });
//
//   describe('addAllDueToday()', () => {
//     it('should create repeatable tasks for today but not dispatch if no tasks to move', async () => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(
//         of([mockRepeatCfg, mockRepeatCfg2]),
//       );
//       store.overrideSelector(selectTasksWithDueTimeForRange, []);
//       store.overrideSelector(selectTasksDueForDay, []);
//       // Empty planner day means no tasks to move to today
//       store.overrideSelector(selectTasksForPlannerDay(getWorklogStr(today)), []);
//       store.overrideSelector(selectTodayTaskIds, []);
//       const dispatchSpy = spyOn(store, 'dispatch');
//
//       const result = await service.addAllDueToday();
//
//       expect(taskRepeatCfgServiceMock.createRepeatableTask).toHaveBeenCalledTimes(2);
//       // No dispatch since no tasks to move
//       expect(dispatchSpy).not.toHaveBeenCalled();
//       expect(result).toBeUndefined();
//     });
//
//     it('should add due tasks to today', async () => {
//       taskRepeatCfgServiceMock.getRepeatableTasksDueForDayOnly$.and.returnValue(of([]));
//       store.overrideSelector(selectTasksWithDueTimeForRange, [mockTaskWithDueTimeToday]);
//       store.overrideSelector(selectTasksDueForDay, [mockTaskWithDueDayToday]);
//       store.overrideSelector(selectTasksForPlannerDay(getWorklogStr(today)), [
//         mockTaskWithDueTimeToday,
//         mockTaskWithDueDayToday,
//       ]);
//       store.overrideSelector(selectTodayTaskIds, []);
//       const dispatchSpy = spyOn(store, 'dispatch');
//
//       const result = await service.addAllDueToday();
//
//       // The service may order tasks differently based on the sorting algorithm
//       expect(dispatchSpy).toHaveBeenCalled();
//       const actualCall = dispatchSpy.calls.first().args[0] as any;
//       expect(actualCall.type).toBe('[Tag] Plan tasks for Today');
//       expect(actualCall.isSkipRemoveReminder).toBe(true);
//       expect(actualCall.taskIds.length).toBe(2);
//       expect(actualCall.taskIds).toContain('task3');
//       expect(actualCall.taskIds).toContain('task4');
//       expect(result).toBe('ADDED');
//     });
//   });
//
//   describe('_sortAll()', () => {
//     it('should sort tasks by due time', () => {
//       const task1: TaskCopy = {
//         ...mockTaskWithDueTimeTomorrow,
//         // eslint-disable-next-line no-mixed-operators
//         dueWithTime: Date.now() + 1000 * 60 * 60 * 14, // 2 PM
//       };
//       const task2: TaskCopy = {
//         ...mockTaskWithDueTimeTomorrow,
//         id: 'task2',
//         // eslint-disable-next-line no-mixed-operators
//         dueWithTime: Date.now() + 1000 * 60 * 60 * 10, // 10 AM
//       };
//       const task3: TaskCopy = {
//         ...mockTaskWithDueTimeTomorrow,
//         id: 'task3',
//         // eslint-disable-next-line no-mixed-operators
//         dueWithTime: Date.now() + 1000 * 60 * 60 * 18, // 6 PM
//       };
//
//       // Access private method via array access notation
//       const sorted = (service as any)._sortAll([task1, task2, task3]);
//
//       expect(sorted[0].id).toBe('task2');
//       expect(sorted[1].id).toBe('task1');
//       expect(sorted[2].id).toBe('task3');
//     });
//
//     it('should sort tasks with due day before tasks without', () => {
//       const taskWithDay: TaskCopy = {
//         ...mockTaskWithDueDayTomorrow,
//         dueDay: '2024-01-01',
//       };
//       const taskWithTime: TaskCopy = {
//         ...mockTaskWithDueTimeTomorrow,
//         // eslint-disable-next-line no-mixed-operators
//         dueWithTime: new Date('2024-01-01').getTime() + 1000 * 60 * 60 * 14,
//       };
//       const taskWithoutDue: TaskCopy = {
//         ...mockTaskWithDueDayTomorrow,
//         id: 'task3',
//         dueDay: undefined,
//       };
//
//       const sorted = (service as any)._sortAll([
//         taskWithoutDue,
//         taskWithTime,
//         taskWithDay,
//       ]);
//
//       expect(sorted[0].id).toBe(taskWithDay.id);
//       expect(sorted[1].id).toBe(taskWithTime.id);
//       expect(sorted[2].id).toBe(taskWithoutDue.id);
//     });
//
//     it('should place tasks with dueDay without time before tasks with dueWithTime on same day', () => {
//       const sameDay = new Date('2024-01-01');
//       const taskWithDay: TaskCopy = {
//         ...mockTaskWithDueDayTomorrow,
//         dueDay: '2024-01-01',
//         dueWithTime: undefined,
//       };
//       const taskWithTime: TaskCopy = {
//         ...mockTaskWithDueTimeTomorrow,
//         // eslint-disable-next-line no-mixed-operators
//         dueWithTime: sameDay.getTime() + 1000 * 60 * 60 * 14,
//         dueDay: undefined,
//       };
//
//       const sorted = (service as any)._sortAll([taskWithTime, taskWithDay]);
//
//       expect(sorted[0].id).toBe(taskWithDay.id);
//       expect(sorted[1].id).toBe(taskWithTime.id);
//     });
//
//     it('should handle edge cases with undefined values', () => {
//       const task1: TaskCopy = {
//         ...mockTaskWithDueDayTomorrow,
//         dueDay: undefined,
//         dueWithTime: undefined,
//       };
//       const task2: TaskCopy = {
//         ...mockTaskWithDueDayTomorrow,
//         id: 'task2',
//         dueDay: '2024-01-01',
//       };
//
//       const sorted = (service as any)._sortAll([task1, task2]);
//
//       expect(sorted[0].id).toBe('task2');
//       expect(sorted[1].id).toBe(task1.id);
//     });
//   });
//
//   describe('_movePlannedTasksToToday()', () => {
//     it('should dispatch action when tasks are provided', () => {
//       const dispatchSpy = spyOn(store, 'dispatch');
//       const tasks = [mockTaskWithDueTimeTomorrow, mockTaskWithDueDayTomorrow];
//
//       (service as any)._movePlannedTasksToToday(tasks);
//
//       // The service may order tasks differently based on the sorting algorithm
//       expect(dispatchSpy).toHaveBeenCalled();
//       const actualCall = dispatchSpy.calls.first().args[0] as any;
//       expect(actualCall.type).toBe('[Tag] Plan tasks for Today');
//       expect(actualCall.isSkipRemoveReminder).toBe(true);
//       expect(actualCall.taskIds.length).toBe(2);
//       expect(actualCall.taskIds).toContain('task1');
//       expect(actualCall.taskIds).toContain('task2');
//     });
//
//     it('should not dispatch when empty array', () => {
//       const dispatchSpy = spyOn(store, 'dispatch');
//
//       (service as any)._movePlannedTasksToToday([]);
//
//       expect(dispatchSpy).not.toHaveBeenCalled();
//     });
//   });
// });
