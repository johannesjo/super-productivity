// import {TestBed} from '@angular/core/testing';
//
// import {PomodoroService} from './pomodoro.service';
// import {GlobalConfigService} from '../config/global-config.service';
// import {EMPTY, from, of} from 'rxjs';
// import {DEFAULT_GLOBAL_CONFIG} from '../config/default-global-config.const';
// import {Actions} from '@ngrx/effects';
// import {Store} from '@ngrx/store';
// import {TestScheduler} from 'rxjs/testing';
//
//
// const testScheduler = new TestScheduler((actual, expected) => {
//   // asserting the two objects are equal
//   expect(actual).toEqual(expected);
// });
//
// describe('PomodoroService', () => {
//   beforeEach(() => TestBed.configureTestingModule({
//     providers: [
//       {
//         provide: GlobalConfigService, useValue: {
//           cfg$: of(DEFAULT_GLOBAL_CONFIG)
//         },
//       },
//       {
//         provide: Actions, useValue: EMPTY,
//       },
//       {
//         provide: Store, useValue: {
//           dispatch: () => false,
//           pipe: () => EMPTY,
//         },
//       },
//     ]
//   }));
//
//   it('tick should map timer to negative', () => {
//     const service: PomodoroService = TestBed.inject(PomodoroService);
//     // service._timer$ = from([999, 1000, 1001]);
//
//     testScheduler.run(({expectObservable}) => {
//       const expectedMarble = '(abc|)';
//       const expectedValues = {a: -999, b: -1000, c: -1001};
//       expectObservable(service.tick$).toBe(expectedMarble, expectedValues);
//     });
//   });
// });
