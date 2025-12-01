import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, Subject } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { SaveToDbEffects } from './save-to-db.effects';
import { PfapiService } from '../../pfapi/pfapi.service';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { Action } from '@ngrx/store';
import { RootState } from '../root-state';
import { selectTagFeatureState } from '../../features/tag/store/tag.reducer';
import { selectProjectFeatureState } from '../../features/project/store/project.selectors';
import { selectConfigFeatureState } from '../../features/config/store/global-config.reducer';
import { take } from 'rxjs/operators';

describe('SaveToDbEffects', () => {
  let actions$: Subject<Action>;
  let effects: SaveToDbEffects;
  let pfapiServiceMock: any;
  let dataInitStateServiceMock: any;
  let store: MockStore<RootState>;

  beforeEach(() => {
    // Mock the pfapiService
    pfapiServiceMock = {
      m: {
        tag: {
          save: jasmine.createSpy('save').and.returnValue(of({})),
        },
        project: {
          save: jasmine.createSpy('save').and.returnValue(of({})),
        },
        globalConfig: {
          save: jasmine.createSpy('save').and.returnValue(of({})),
        },
      },
    };

    // Mock the dataInitStateService
    dataInitStateServiceMock = {
      isAllDataLoadedInitially$: of(true),
    };

    actions$ = new Subject<Action>();

    TestBed.configureTestingModule({
      providers: [
        SaveToDbEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {},
        }),
        { provide: PfapiService, useValue: pfapiServiceMock },
        { provide: DataInitStateService, useValue: dataInitStateServiceMock },
      ],
    });

    store = TestBed.inject(MockStore);
    effects = TestBed.inject(SaveToDbEffects);

    // Reset mock store state to ensure clean test environment
    store.resetSelectors();

    // Set up meta-reducer simulation to make actions trigger state changes
    // Store the original dispatch method
    const originalStoreDispatch = store.dispatch.bind(store);

    // Override dispatch to emit actions to the stream
    (store as any).dispatch = (action: Action) => {
      // Emit the action to the actions$ stream first (simulating the action happening)
      actions$.next(action);
      // Then call the original dispatch
      originalStoreDispatch(action);
    };
  });

  afterEach(() => {
    // Clean up subscriptions and reset state
    store.resetSelectors();
    actions$.complete();
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });

  describe('Critical behavior: next action after state change is the triggering action', () => {
    it('should capture the action that triggered the state change for tag state', (done) => {
      // Setup initial state
      const initialTagState = { someTagData: 'initial' };
      const updatedTagState = { someTagData: 'updated' };
      const triggeringAction = { type: 'UPDATE_TAG_ACTION' };

      // Mock the selector
      const mockTagSelector = store.overrideSelector(
        selectTagFeatureState as any,
        initialTagState,
      );

      // Subscribe to the effect
      const subscription = effects.tag$.pipe(take(1)).subscribe(() => {
        // Verify that save was called with the updated state
        expect(pfapiServiceMock.m.tag.save).toHaveBeenCalledWith(updatedTagState, {
          isUpdateRevAndLastUpdate: true,
        });
        subscription.unsubscribe();
        done();
      });

      // Simulate the sequence: state change followed by the action that triggered it
      // 1. First trigger the state change
      mockTagSelector.setResult(updatedTagState);
      store.refreshState();

      // 2. Dispatch the action (which will also emit it to actions$ via our spy)
      store.dispatch(triggeringAction);
    });

    it('should capture the action that triggered the state change for project state', (done) => {
      // Setup initial state
      const initialProjectState = { someProjectData: 'initial' };
      const updatedProjectState = { someProjectData: 'updated' };
      const triggeringAction = { type: 'UPDATE_PROJECT_ACTION' };

      // Mock the selector
      const mockProjectSelector = store.overrideSelector(
        selectProjectFeatureState as any,
        initialProjectState,
      );

      // Subscribe to the effect
      const subscription = effects.project$.pipe(take(1)).subscribe(() => {
        // Verify that save was called with the updated state
        expect(pfapiServiceMock.m.project.save).toHaveBeenCalledWith(
          updatedProjectState,
          {
            isUpdateRevAndLastUpdate: true,
          },
        );
        subscription.unsubscribe();
        done();
      });

      // Simulate the sequence: state change followed by the action that triggered it
      mockProjectSelector.setResult(updatedProjectState);
      store.refreshState();
      store.dispatch(triggeringAction);
    });

    it('should filter out ignored actions when they follow state changes', (done) => {
      // Setup
      const initialTagState = { someTagData: 'initial' };
      const updatedTagState = { someTagData: 'updated' };
      const ignoredAction = { type: 'loadAllData' }; // This is in ALWAYS_IGNORED_ACTIONS

      // Mock the selector
      const mockTagSelector = store.overrideSelector(
        selectTagFeatureState as any,
        initialTagState,
      );

      // Simulate state change followed by ignored action
      mockTagSelector.setResult(updatedTagState);
      store.refreshState();
      store.dispatch(ignoredAction);

      // Wait a bit to ensure the effect had time to process
      // The effect should filter out the ignored action and not call save
      setTimeout(() => {
        expect(pfapiServiceMock.m.tag.save).not.toHaveBeenCalled();
        done();
      }, 25);
    });

    it('should handle multiple sequential state changes with their corresponding actions', (done) => {
      const states = [
        { someTagData: 'state1' },
        { someTagData: 'state2' },
        { someTagData: 'state3' },
      ];
      const actions = [{ type: 'ACTION_1' }, { type: 'ACTION_2' }, { type: 'ACTION_3' }];

      const mockTagSelector = store.overrideSelector(selectTagFeatureState as any, {
        someTagData: 'initial',
      });
      let saveCallIndex = 0;

      // Subscribe to the effect
      const subscription = effects.tag$.subscribe(() => {
        // Verify the save was called with the correct state
        // Note: We need to check against saveCallIndex, not saveCallCount
        expect(pfapiServiceMock.m.tag.save).toHaveBeenCalledWith(states[saveCallIndex], {
          isUpdateRevAndLastUpdate: true,
        });

        saveCallIndex++;

        if (saveCallIndex === 3) {
          // All state changes processed
          expect(pfapiServiceMock.m.tag.save).toHaveBeenCalledTimes(3);
          subscription.unsubscribe();
          done();
        }
      });

      // Simulate multiple state changes, each followed by its triggering action
      // Process state changes with small delays to ensure proper sequencing
      mockTagSelector.setResult(states[0]);
      store.refreshState();
      store.dispatch(actions[0]);

      setTimeout(() => {
        mockTagSelector.setResult(states[1]);
        store.refreshState();
        store.dispatch(actions[1]);

        setTimeout(() => {
          mockTagSelector.setResult(states[2]);
          store.refreshState();
          store.dispatch(actions[2]);
        }, 5);
      }, 5);
    });

    it('should correctly associate state changes with their triggering actions in createSaveEffectWithFilter', (done) => {
      // This tests the second occurrence of the pattern in createSaveEffectWithFilter
      const initialConfigState = { someConfig: 'initial' };
      const updatedConfigState = { someConfig: 'updated' };
      const triggeringAction = { type: 'UPDATE_CONFIG_ACTION' };

      const mockConfigSelector = store.overrideSelector(
        selectConfigFeatureState as any,
        initialConfigState,
      );

      const subscription = effects.globalCfg$.pipe(take(1)).subscribe(() => {
        expect(pfapiServiceMock.m.globalConfig.save).toHaveBeenCalledWith(
          updatedConfigState,
          {
            isUpdateRevAndLastUpdate: true,
          },
        );
        subscription.unsubscribe();
        done();
      });

      // Test the critical pattern
      mockConfigSelector.setResult(updatedConfigState);
      store.refreshState();
      store.dispatch(triggeringAction);
    });
  });
});
