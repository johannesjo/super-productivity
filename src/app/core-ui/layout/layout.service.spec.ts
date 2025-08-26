import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { LayoutService } from './layout.service';
import { hideAddTaskBar, showAddTaskBar } from './store/layout.actions';
import { of } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router } from '@angular/router';
import { WorkContextService } from '../../features/work-context/work-context.service';

describe('LayoutService', () => {
  let service: LayoutService;
  let mockStore: jasmine.SpyObj<Store>;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'pipe', 'select']);
    const breakpointObserverSpy = jasmine.createSpyObj('BreakpointObserver', ['observe']);
    const routerSpy = jasmine.createSpyObj('Router', [], {
      events: of(new NavigationEnd(0, '/', '/')),
      url: '/',
    });
    const workContextServiceSpy = jasmine.createSpyObj('WorkContextService', [], {
      onWorkContextChange$: of(null),
      activeWorkContext$: of(null),
    });

    // Setup default return values
    storeSpy.pipe.and.returnValue(of(false));
    storeSpy.select.and.returnValue(of({}));
    breakpointObserverSpy.observe.and.returnValue(
      of({ matches: false, breakpoints: {} }),
    );

    TestBed.configureTestingModule({
      providers: [
        LayoutService,
        { provide: Store, useValue: storeSpy },
        { provide: BreakpointObserver, useValue: breakpointObserverSpy },
        { provide: Router, useValue: routerSpy },
        { provide: WorkContextService, useValue: workContextServiceSpy },
      ],
    });

    service = TestBed.inject(LayoutService);
    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Focus restoration', () => {
    let mockTaskElement: HTMLElement;

    beforeEach(() => {
      // Create a mock task element
      mockTaskElement = document.createElement('div');
      mockTaskElement.id = 't-task123';
      mockTaskElement.tabIndex = 0;
      document.body.appendChild(mockTaskElement);
    });

    afterEach(() => {
      if (mockTaskElement && mockTaskElement.parentNode) {
        mockTaskElement.parentNode.removeChild(mockTaskElement);
      }
    });

    it('should store focused task element when showing add task bar', () => {
      // Focus the task element
      Object.defineProperty(document, 'activeElement', {
        value: mockTaskElement,
        writable: true,
      });

      // Show add task bar
      service.showAddTaskBar();

      // Verify the dispatch was called
      expect(mockStore.dispatch).toHaveBeenCalledWith(showAddTaskBar());
    });

    it('should restore focus to task when hiding add task bar', (done) => {
      // Spy on focus method
      spyOn(mockTaskElement, 'focus');

      // Set as active element
      Object.defineProperty(document, 'activeElement', {
        value: mockTaskElement,
        writable: true,
      });

      // Show add task bar (which stores the focused element)
      service.showAddTaskBar();

      // Hide add task bar
      service.hideAddTaskBar();

      // Verify hideAddTaskBar action was dispatched
      expect(mockStore.dispatch).toHaveBeenCalledWith(hideAddTaskBar());

      // Wait for the timeout to restore focus
      setTimeout(() => {
        expect(mockTaskElement.focus).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should not store focus if active element is not a task', (done) => {
      // Spy on focus method
      spyOn(mockTaskElement, 'focus');

      // Create a non-task element
      const nonTaskElement = document.createElement('input');
      nonTaskElement.id = 'some-input';
      document.body.appendChild(nonTaskElement);
      Object.defineProperty(document, 'activeElement', {
        value: nonTaskElement,
        writable: true,
      });

      // Show add task bar
      service.showAddTaskBar();

      // Hide add task bar
      service.hideAddTaskBar();

      // Wait for the timeout
      setTimeout(() => {
        expect(mockTaskElement.focus).not.toHaveBeenCalled();
        document.body.removeChild(nonTaskElement);
        done();
      }, 100);
    });

    it('should not restore focus if element is removed from DOM', (done) => {
      // Spy on focus method
      spyOn(mockTaskElement, 'focus');

      // Set as active element
      Object.defineProperty(document, 'activeElement', {
        value: mockTaskElement,
        writable: true,
      });

      // Show add task bar (which stores the focused element)
      service.showAddTaskBar();

      // Remove element from DOM
      if (mockTaskElement.parentNode) {
        mockTaskElement.parentNode.removeChild(mockTaskElement);
      }

      // Hide add task bar
      service.hideAddTaskBar();

      // Wait for the timeout
      setTimeout(() => {
        expect(mockTaskElement.focus).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});
