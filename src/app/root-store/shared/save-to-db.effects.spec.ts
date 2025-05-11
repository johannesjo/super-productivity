// import { TestBed } from '@angular/core/testing';
// import { provideMockActions } from '@ngrx/effects/testing';
// import { BehaviorSubject, Observable, of } from 'rxjs';
// import { MockStore, provideMockStore } from '@ngrx/store/testing';
//
// import { SaveToDbEffects } from './save-to-db.effects';
// import { PfapiService } from '../../pfapi/pfapi.service';
// import { DataInitStateService } from '../../core/data-init/data-init-state.service';
// import { Action } from '@ngrx/store';
// import { RootState } from '../root-state';
//
// describe('SaveToDbEffects', () => {
//   let actions$: Observable<any>;
//   let effects: SaveToDbEffects;
//   let pfapiServiceMock: any;
//   let dataInitStateServiceMock: any;
//   let store: MockStore<RootState>;
//
//   beforeEach(() => {
//     // Mock the pfapiService
//     pfapiServiceMock = {
//       m: {
//         tag: {
//           save: jasmine.createSpy('save').and.returnValue(of({})),
//         },
//       },
//     };
//
//     // Mock the dataInitStateService
//     dataInitStateServiceMock = {
//       isAllDataLoadedInitially$: of(true),
//     };
//
//     TestBed.configureTestingModule({
//       providers: [
//         SaveToDbEffects,
//         provideMockActions(() => actions$),
//         provideMockStore(),
//         { provide: PfapiService, useValue: pfapiServiceMock },
//         { provide: DataInitStateService, useValue: dataInitStateServiceMock },
//       ],
//     });
//
//     effects = TestBed.inject(SaveToDbEffects);
//     store = TestBed.inject(MockStore);
//   });
//
//   it('should be created', () => {
//     expect(effects).toBeTruthy();
//   });
//
//   it('should save tag state to db when tag state changes', (done) => {
//     // Mock the selector for tag state
//     const tagState = { someTagData: 'test' };
//     const mockTagSelector = store.overrideSelector('selectTagFeatureState', tagState);
//
//     // Set up actions stream
//     const action$ = new BehaviorSubject<Action>({ type: 'TEST_ACTION' });
//     actions$ = action$.asObservable();
//
//     // Subscribe to the effect - this won't emit anything until store state changes
//     effects.tag$.subscribe(() => {
//       expect(pfapiServiceMock.m.tag.save).toHaveBeenCalledWith(tagState, {
//         isUpdateRevAndLastUpdate: true,
//       });
//       done();
//     });
//
//     // Trigger a state change that will be detected by the effect
//     // We need to emit a new state (different reference) to trigger the effect
//     mockTagSelector.setResult({ ...tagState });
//     store.refreshState();
//
//     // Emit an action (which will be captured by the effect for filtering)
//     action$.next({ type: 'SOME_NON_IGNORED_ACTION' });
//   });
// });
