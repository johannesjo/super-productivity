// import { TestBed } from '@angular/core/testing';
// import { AddTasksForTomorrowService } from './add-tasks-for-tomorrow.service';
// import { Store } from '@ngrx/store';
// import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
// import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
// import { BehaviorSubject, of } from 'rxjs';
// import { provideMockStore } from '@ngrx/store/testing';
// // import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
// // import { updateTaskTags } from '../tasks/store/task.actions';
// // import { TODAY_TAG } from '../tag/tag.const';
// // import * as TaskSelectors from '../tasks/store/task.selectors';
//
// fdescribe('AddTasksForTomorrowService', () => {
//   let service: AddTasksForTomorrowService;
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
//   // const mockTaskWithDueTimeTomorrow: TaskWithDueTime = {
//   //   id: 'task1',
//   //   title: 'Task with due time',
//   //   tagIds: [],
//   //   dueWithTime: tomorrow.getTime(),
//   // } as Partial<TaskWithDueTime> as TaskWithDueTime;
//   //
//   // const mockTaskWithDueDayTomorrow: TaskWithDueDay = {
//   //   id: 'task2',
//   //   title: 'Task with due day',
//   //   tagIds: [],
//   //   dueDay: tomorrowStr,
//   // } as Partial<TaskWithDueDay> as TaskWithDueDay;
//   //
//   // const mockRepeatCfg: TaskRepeatCfg = {
//   //   id: 'repeat1',
//   //   title: 'Repeatable task',
//   //   projectId: 'project1',
//   //   order: 0,
//   // } as TaskRepeatCfg;
//
//   // Setup before each test
//   beforeEach(() => {
//     taskRepeatCfgServiceMock = jasmine.createSpyObj('TaskRepeatCfgService', [
//       'getRepeatTableTasksDueForDayIncludingOverdue$',
//       'getRepeatTableTasksDueForDayOnly$',
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
//     taskRepeatCfgServiceMock.getRepeatTableTasksDueForDayIncludingOverdue$.and.returnValue(
//       of([]),
//     );
//     taskRepeatCfgServiceMock.getRepeatTableTasksDueForDayOnly$.and.returnValue(of([]));
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
//             tasks: {},
//           },
//         }),
//       ],
//     });
//
//     service = TestBed.inject(AddTasksForTomorrowService);
//   });
//
//   it('should be created', () => {
//     expect(service).toBeTruthy();
//   });
//
//   describe('addAllDueToday()', () => {
//     it('should assemble the correct data ', async () => {
//       spyOn(service, '_addAllDue');
//       await service.addAllDueToday();
//       expect(service._addAllDue).toHaveBeenCalledWith(today.getTime(), [], [], []);
//     });
//   });
// });
