import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { WorkContextEffects } from './work-context.effects';
import { setActiveWorkContext } from './work-context.actions';
import { setSelectedTask } from '../../tasks/store/task.actions';
import { TaskService } from '../../tasks/task.service';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { Router, NavigationEnd } from '@angular/router';
import { LOCAL_ACTIONS } from '../../../util/local-actions.token';
import { WorkContextType } from '../work-context.model';
import { WorkContextService } from '../work-context.service';
import { HydrationStateService } from '../../../op-log/apply/hydration-state.service';
import { TODAY_TAG } from '../../tag/tag.const';

describe('WorkContextEffects', () => {
  let effects: WorkContextEffects;
  let actions$: Subject<any>;
  let store: MockStore;
  let bannerServiceSpy: jasmine.SpyObj<BannerService>;
  let taskServiceMock: { isTaskDataLoaded$: BehaviorSubject<boolean> };
  let routerEventsSpy: Subject<any>;
  let hydrationStateServiceSpy: jasmine.SpyObj<HydrationStateService>;
  let workContextServiceMock: {
    activeWorkContextTypeAndId$: BehaviorSubject<any>;
  };

  beforeEach(() => {
    actions$ = new Subject<any>();
    routerEventsSpy = new Subject<any>();

    bannerServiceSpy = jasmine.createSpyObj('BannerService', ['dismiss']);
    taskServiceMock = {
      isTaskDataLoaded$: new BehaviorSubject<boolean>(true),
    };
    hydrationStateServiceSpy = jasmine.createSpyObj('HydrationStateService', [
      'isApplyingRemoteOps',
      'isInSyncWindow',
    ]);
    hydrationStateServiceSpy.isApplyingRemoteOps.and.returnValue(false);
    hydrationStateServiceSpy.isInSyncWindow.and.returnValue(false);

    workContextServiceMock = {
      activeWorkContextTypeAndId$: new BehaviorSubject({
        activeType: WorkContextType.PROJECT,
        activeId: 'project-1',
      }),
    };

    const routerMock = {
      events: routerEventsSpy,
      url: '/work/project-1',
    };

    TestBed.configureTestingModule({
      providers: [
        WorkContextEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: TaskService, useValue: taskServiceMock },
        { provide: BannerService, useValue: bannerServiceSpy },
        { provide: Router, useValue: routerMock },
        { provide: LOCAL_ACTIONS, useValue: actions$ },
        { provide: HydrationStateService, useValue: hydrationStateServiceSpy },
        { provide: WorkContextService, useValue: workContextServiceMock },
      ],
    });

    effects = TestBed.inject(WorkContextEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('dismissContextScopeBannersOnContextChange', () => {
    it('should dismiss JiraUnblock banner on context change', (done) => {
      effects.dismissContextScopeBannersOnContextChange.subscribe(() => {
        expect(bannerServiceSpy.dismiss).toHaveBeenCalledWith(BannerId.JiraUnblock);
        done();
      });

      actions$.next(
        setActiveWorkContext({
          activeId: 'new-project',
          activeType: WorkContextType.PROJECT,
        }),
      );
    });
  });

  describe('unselectSelectedTask$', () => {
    it('should unselect task when context changes and data is loaded', (done) => {
      taskServiceMock.isTaskDataLoaded$.next(true);

      effects.unselectSelectedTask$.subscribe((action: any) => {
        expect(action.type).toBe(setSelectedTask.type);
        expect(action.id).toBe(null);
        done();
      });

      actions$.next(
        setActiveWorkContext({
          activeId: 'new-project',
          activeType: WorkContextType.PROJECT,
        }),
      );
    });

    it('should NOT unselect task when data is not loaded', (done) => {
      taskServiceMock.isTaskDataLoaded$.next(false);

      let emitted = false;
      effects.unselectSelectedTask$.subscribe(() => {
        emitted = true;
      });

      actions$.next(
        setActiveWorkContext({
          activeId: 'new-project',
          activeType: WorkContextType.PROJECT,
        }),
      );

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });
  });

  describe('switchToTodayContextOnSpecialRoutes$', () => {
    it('should switch to TODAY tag when navigating to schedule page', (done) => {
      workContextServiceMock.activeWorkContextTypeAndId$.next({
        activeType: WorkContextType.PROJECT,
        activeId: 'project-1',
      });

      effects.switchToTodayContextOnSpecialRoutes$.subscribe((action: any) => {
        expect(action.type).toBe(setActiveWorkContext.type);
        expect(action.activeId).toBe(TODAY_TAG.id);
        expect(action.activeType).toBe(WorkContextType.TAG);
        done();
      });

      routerEventsSpy.next(new NavigationEnd(1, '/schedule', '/schedule'));
    });

    it('should switch to TODAY tag when navigating to planner page', (done) => {
      workContextServiceMock.activeWorkContextTypeAndId$.next({
        activeType: WorkContextType.PROJECT,
        activeId: 'project-1',
      });

      effects.switchToTodayContextOnSpecialRoutes$.subscribe((action: any) => {
        expect(action.type).toBe(setActiveWorkContext.type);
        expect(action.activeId).toBe(TODAY_TAG.id);
        done();
      });

      routerEventsSpy.next(new NavigationEnd(1, '/planner', '/planner'));
    });

    it('should switch to TODAY tag when navigating to boards page', (done) => {
      workContextServiceMock.activeWorkContextTypeAndId$.next({
        activeType: WorkContextType.PROJECT,
        activeId: 'project-1',
      });

      effects.switchToTodayContextOnSpecialRoutes$.subscribe((action: any) => {
        expect(action.type).toBe(setActiveWorkContext.type);
        expect(action.activeId).toBe(TODAY_TAG.id);
        done();
      });

      routerEventsSpy.next(new NavigationEnd(1, '/boards', '/boards'));
    });

    it('should NOT switch when already on TODAY tag', (done) => {
      workContextServiceMock.activeWorkContextTypeAndId$.next({
        activeType: WorkContextType.TAG,
        activeId: TODAY_TAG.id,
      });

      let emitted = false;
      effects.switchToTodayContextOnSpecialRoutes$.subscribe(() => {
        emitted = true;
      });

      routerEventsSpy.next(new NavigationEnd(1, '/schedule', '/schedule'));

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT switch when applying remote ops (sync guard)', (done) => {
      hydrationStateServiceSpy.isApplyingRemoteOps.and.returnValue(true);
      workContextServiceMock.activeWorkContextTypeAndId$.next({
        activeType: WorkContextType.PROJECT,
        activeId: 'project-1',
      });

      let emitted = false;
      effects.switchToTodayContextOnSpecialRoutes$.subscribe(() => {
        emitted = true;
      });

      routerEventsSpy.next(new NavigationEnd(1, '/schedule', '/schedule'));

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });

    it('should NOT switch for non-special routes', (done) => {
      workContextServiceMock.activeWorkContextTypeAndId$.next({
        activeType: WorkContextType.PROJECT,
        activeId: 'project-1',
      });

      let emitted = false;
      effects.switchToTodayContextOnSpecialRoutes$.subscribe(() => {
        emitted = true;
      });

      routerEventsSpy.next(new NavigationEnd(1, '/work', '/work'));

      setTimeout(() => {
        expect(emitted).toBe(false);
        done();
      }, 50);
    });
  });
});
