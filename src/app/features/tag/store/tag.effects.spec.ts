import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { EMPTY, Observable, of } from 'rxjs';
import { TagEffects } from './tag.effects';
import { updateTag } from './tag.actions';
import { TODAY_TAG } from '../tag.const';
import { selectTodayTagRepair } from '../../work-context/store/work-context.selectors';
import { HydrationStateService } from '../../../core/persistence/operation-log/processing/hydration-state.service';
import { SnackService } from '../../../core/snack/snack.service';
import { TagService } from '../tag.service';
import { WorkContextService } from '../../work-context/work-context.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { PlannerService } from '../../planner/planner.service';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import { WorkContextType } from '../../work-context/work-context.model';

/**
 * Tests for TagEffects, specifically the repairTodayTagConsistency$ effect.
 *
 * The effect repairs TODAY_TAG.taskIds when it becomes inconsistent with
 * tasks' dueDay values, typically after sync conflict resolution.
 */
describe('TagEffects', () => {
  let effects: TagEffects;
  let actions$: Observable<any>;
  let store: MockStore;
  let hydrationStateServiceSpy: jasmine.SpyObj<HydrationStateService>;

  beforeEach(() => {
    actions$ = EMPTY;

    hydrationStateServiceSpy = jasmine.createSpyObj('HydrationStateService', [
      'isApplyingRemoteOps',
      'isInSyncWindow',
    ]);
    // Default: not applying remote ops (so effect should fire)
    hydrationStateServiceSpy.isApplyingRemoteOps.and.returnValue(false);
    hydrationStateServiceSpy.isInSyncWindow.and.returnValue(false);

    const snackServiceSpy = jasmine.createSpyObj('SnackService', ['open']);
    const tagServiceSpy = jasmine.createSpyObj('TagService', ['updateTag']);
    const workContextServiceSpy = jasmine.createSpyObj('WorkContextService', [], {
      activeWorkContextId: 'test-id',
      activeWorkContextTypeAndId$: of({
        activeType: WorkContextType.TAG,
        activeId: 'test-id',
      }),
      mainListTasks$: of([]),
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateServiceSpy.instant.and.returnValue('Today');
    const plannerServiceSpy = jasmine.createSpyObj('PlannerService', [
      'getSnackExtraStr',
    ]);
    plannerServiceSpy.getSnackExtraStr.and.returnValue(Promise.resolve(''));

    TestBed.configureTestingModule({
      providers: [
        TagEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            {
              selector: selectTodayTagRepair,
              value: null, // Default: no repair needed
            },
          ],
        }),
        { provide: HydrationStateService, useValue: hydrationStateServiceSpy },
        { provide: SnackService, useValue: snackServiceSpy },
        { provide: TagService, useValue: tagServiceSpy },
        { provide: WorkContextService, useValue: workContextServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
        { provide: PlannerService, useValue: plannerServiceSpy },
        { provide: LOCAL_ACTIONS, useValue: EMPTY },
      ],
    });

    effects = TestBed.inject(TagEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('repairTodayTagConsistency$', () => {
    it('should dispatch updateTag when repair is needed', (done) => {
      const repairedTaskIds = ['task1', 'task2'];
      store.overrideSelector(selectTodayTagRepair, {
        needsRepair: true,
        repairedTaskIds,
      });
      store.refreshState();

      effects.repairTodayTagConsistency$.subscribe((action) => {
        expect(action).toEqual(
          updateTag({
            tag: {
              id: TODAY_TAG.id,
              changes: { taskIds: repairedTaskIds },
            },
            isSkipSnack: true,
          }),
        );
        done();
      });
    });

    it('should not dispatch when no repair is needed (null)', (done) => {
      store.overrideSelector(selectTodayTagRepair, null);
      store.refreshState();

      let emitted = false;
      effects.repairTodayTagConsistency$.subscribe(() => {
        emitted = true;
      });

      // Give it time to potentially emit
      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should not dispatch when needsRepair is false', (done) => {
      store.overrideSelector(selectTodayTagRepair, {
        needsRepair: false,
        repairedTaskIds: [],
      } as any);
      store.refreshState();

      let emitted = false;
      effects.repairTodayTagConsistency$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should not dispatch during sync window (skipDuringSyncWindow)', (done) => {
      // Simulate being in sync window (either applying ops or in post-sync cooldown)
      hydrationStateServiceSpy.isInSyncWindow.and.returnValue(true);

      store.overrideSelector(selectTodayTagRepair, {
        needsRepair: true,
        repairedTaskIds: ['task1'],
      });
      store.refreshState();

      let emitted = false;
      effects.repairTodayTagConsistency$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should handle empty repairedTaskIds', (done) => {
      store.overrideSelector(selectTodayTagRepair, {
        needsRepair: true,
        repairedTaskIds: [],
      });
      store.refreshState();

      effects.repairTodayTagConsistency$.subscribe((action) => {
        expect(action).toEqual(
          updateTag({
            tag: {
              id: TODAY_TAG.id,
              changes: { taskIds: [] },
            },
            isSkipSnack: true,
          }),
        );
        done();
      });
    });
  });
});
