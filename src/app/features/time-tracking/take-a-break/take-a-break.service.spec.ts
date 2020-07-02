// import { TestBed } from '@angular/core/testing';
// import { TakeABreakService } from './take-a-break.service';
// import { StoreModule } from '@ngrx/store';
// import { reducers } from '../../../root-store';
// import { EffectsModule } from '@ngrx/effects';
// import { CoreModule } from '../../../core/core.module';
// import { ElectronService } from 'ngx-electron';
//
// let service: TakeABreakService;
//
// describe('TakeABreakService', () => {
//   beforeEach(() => TestBed.configureTestingModule({
//     providers: [
//       TakeABreakService,
//       ElectronService,
//     ],
//     imports: [
//       CoreModule,
//       StoreModule.forRoot(reducers),
//       EffectsModule.forRoot([]),
//     ]
//   }));
//
//   it('should be created', () => {
//     service = TestBed.inject(TakeABreakService);
//     expect(service).toBeTruthy();
//   });
// });

//
// // Straight Jasmine testing without Angular's testing support
// import { TakeABreakService } from './take-a-break.service';
// import { Subject } from 'rxjs';
//
// describe('ValueService', () => {
//   let service: TakeABreakService;
//   beforeEach(() => {
//     service = new TakeABreakService(
//       {isDataLoaded$: new Subject(), currentTaskId$: new Subject()},
//       {},
//       {},
//       {},
//       {},
//       {},
//     );
//   });
//
//   it('#getValue should return real value', () => {
//     expect(service.getValue()).toBe('real value');
//   });
// });
