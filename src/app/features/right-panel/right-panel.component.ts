import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { LanguageService } from '../../core/language/language.service';
import { IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter, map, switchMap, startWith } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { SwipeDirective } from '../../ui/swipe-gesture/swipe.directive';
import { CssString, StyleObject, StyleObjectToString } from '../../util/styles';
import { LS } from '../../core/persistence/storage-keys.const';
import { readNumberLSBounded } from '../../util/ls-util';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { RightPanelContentComponent } from './right-panel-content.component';
import { TaskService } from '../tasks/task.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { Store } from '@ngrx/store';
import { hidePluginPanel } from '../../core-ui/layout/store/layout.actions';
import { TaskDetailTargetPanel } from '../tasks/task.model';
import {
  selectLayoutFeatureState,
  INITIAL_LAYOUT_STATE,
} from '../../core-ui/layout/store/layout.reducer';

// Right panel resize constants
const RIGHT_PANEL_CONFIG = {
  DEFAULT_WIDTH: 320,
  MIN_WIDTH: 280,
  MAX_WIDTH: 800,
  RESIZABLE: true,
  CLOSE_THRESHOLD: 100,
} as const;

@Component({
  selector: 'right-panel',
  templateUrl: './right-panel.component.html',
  styleUrls: ['./right-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [SwipeDirective, MatIconModule, MatRippleModule, RightPanelContentComponent],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isOpen]': 'isOpen()',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.resizing]': 'isResizing()',
  },
  standalone: true,
})
export class RightPanelComponent implements OnInit, OnDestroy {
  private _domSanitizer = inject(DomSanitizer);
  private _languageService = inject(LanguageService);
  private _router = inject(Router);
  private _taskService = inject(TaskService);
  private _layoutService = inject(LayoutService);
  private _store = inject(Store);

  readonly sideWidth = input<number>(40);
  readonly wasClosed = output<void>();

  readonly isRTL = this._languageService.isLangRTL;

  // Convert observables to signals to match right-panel-content logic
  private readonly _selectedTask = toSignal(this._taskService.selectedTask$, {
    initialValue: null,
  });

  private readonly _taskDetailPanelTargetPanel = toSignal(
    this._taskService.taskDetailPanelTargetPanel$,
    { initialValue: null },
  );

  private readonly _layoutFeatureState = toSignal(
    this._store.select(selectLayoutFeatureState),
    {
      initialValue: INITIAL_LAYOUT_STATE,
    },
  );

  private readonly _currentRoute = toSignal(
    this._router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this._router.url),
    ),
    { initialValue: this._router.url },
  );

  // Get isOpen from the same logic as right-panel-content
  readonly isOpen = computed<boolean>(() => {
    const selectedTask = this._selectedTask();
    const targetPanel = this._taskDetailPanelTargetPanel();
    const layoutState = this._layoutFeatureState();
    const currentRoute = this._currentRoute();

    if (!layoutState) {
      return false;
    }

    const {
      isShowNotes,
      isShowIssuePanel: isShowAddTaskPanel,
      isShowTaskViewCustomizerPanel,
      isShowPluginPanel,
    } = layoutState;

    const isWorkView = this._isWorkViewUrl(currentRoute);

    // For non-work-view routes, still allow panels
    if (!isWorkView) {
      // Panels can still be shown on non-work views
    }

    const hasContent = !!(
      selectedTask ||
      isShowNotes ||
      isShowAddTaskPanel ||
      isShowTaskViewCustomizerPanel ||
      isShowPluginPanel
    );

    return (
      hasContent &&
      targetPanel !== TaskDetailTargetPanel.DONT_OPEN_PANEL &&
      !this._layoutService.isXs()
    ); // Don't show on mobile - handled by bottom sheet
  });

  // Resize functionality
  readonly currentWidth = signal<number>(RIGHT_PANEL_CONFIG.DEFAULT_WIDTH);
  readonly isResizing = signal(false);
  private readonly _startX = signal(0);
  private readonly _startWidth = signal(0);

  // Store bound functions to prevent memory leaks
  private readonly _boundOnDrag = this._handleDrag.bind(this);
  private readonly _boundOnDragEnd = this._handleDragEnd.bind(this);

  // Track listener state to prevent double attachment/removal
  private _isListenersAttached = false;

  // Performance optimization for drag events
  private _lastDragTime = 0;
  private readonly _dragThrottleMs = 16; // ~60fps

  // Computed panel width for CSS binding
  readonly panelWidth = computed(() => this.currentWidth());

  readonly sideStyle = computed<SafeStyle>(() => {
    const styles =
      this._getWidthRelatedStyles() +
      (this._shouldSkipAnimation() ? ' transition: none;' : '');
    return this._domSanitizer.bypassSecurityTrustStyle(styles);
  });

  // Skip animations during navigation using RxJS
  private readonly _skipAnimationDuringNav = toSignal(
    this._router.events.pipe(
      filter(
        (event) => event instanceof NavigationStart || event instanceof NavigationEnd,
      ),
      map((event) => event instanceof NavigationStart),
      // When navigation starts, immediately return true
      // When navigation ends, delay returning false by 100ms
      switchMap((isNavigating) =>
        isNavigating ? of(true) : timer(100).pipe(map(() => false)),
      ),
      startWith(false), // Start with animations enabled
    ),
    { initialValue: false },
  );

  // Computed signal that determines if animations should be skipped
  private readonly _shouldSkipAnimation = computed(() => this._skipAnimationDuringNav());

  updateStyleAfterTransition(): void {
    // Handle visibility after transition ends
    if (!this.isOpen()) {
      // We could update styles here if needed, but the drawer handles this via CSS
    }
  }

  ngOnInit(): void {
    this._initializeWidth();
  }

  ngOnDestroy(): void {
    // Clean up resize state if active (emergency cleanup)
    if (this.isResizing()) {
      this._handleDragEnd();
    }
  }

  close(): void {
    // FORCE blur because otherwise task notes won't save
    if (IS_TOUCH_PRIMARY) {
      document.querySelectorAll('input,textarea').forEach((element) => {
        if (element === document.activeElement) {
          return (element as HTMLElement).blur();
        }
      });
    }

    // Delegate to task service and layout service to close the panel
    this._taskService.setSelectedId(null);
    this._layoutService.hideNotes();
    this._layoutService.hideAddTaskPanel();
    this._layoutService.hideTaskViewCustomizerPanel();
    this._store.dispatch(hidePluginPanel());

    this.wasClosed.emit();
  }

  private _isWorkViewUrl(url: string): boolean {
    return url.includes('/active/') || url.includes('/tag/') || url.includes('/project/');
  }

  private _getWidthRelatedStyles(): CssString {
    const isOpen = this.isOpen();

    // Use the current panel width for resize functionality
    const px = this.panelWidth();
    const widthVal = px > 0 ? `${px}px` : `${this.sideWidth()}%`;

    const styles: StyleObject = { width: isOpen ? widthVal : '0' };

    return StyleObjectToString(styles);
  }

  // Resize functionality methods
  onResizeStart(event: MouseEvent): void {
    if (!RIGHT_PANEL_CONFIG.RESIZABLE || this._isListenersAttached) return;

    this.isResizing.set(true);
    this._startX.set(event.clientX);
    this._startWidth.set(this.currentWidth());

    // Mark listeners as attached before adding them
    this._isListenersAttached = true;
    document.addEventListener('mousemove', this._boundOnDrag);
    document.addEventListener('mouseup', this._boundOnDragEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    event.preventDefault();
  }

  private _handleDrag(event: MouseEvent): void {
    if (!this.isResizing()) return;

    // Throttle drag events for better performance
    const now = Date.now();
    if (now - this._lastDragTime < this._dragThrottleMs) return;
    this._lastDragTime = now;

    // Right panel resizes from left edge, so subtract delta
    const deltaX = this._startX() - event.clientX;
    const potentialWidth = this._startWidth() + deltaX;

    // If dragged below close threshold, close the panel immediately
    if (potentialWidth < RIGHT_PANEL_CONFIG.CLOSE_THRESHOLD) {
      this.isResizing.set(false);
      this._isListenersAttached = false;
      document.removeEventListener('mousemove', this._boundOnDrag);
      document.removeEventListener('mouseup', this._boundOnDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      this.close();
      return;
    }

    const newWidth = Math.max(
      RIGHT_PANEL_CONFIG.MIN_WIDTH,
      Math.min(RIGHT_PANEL_CONFIG.MAX_WIDTH, potentialWidth),
    );

    this.currentWidth.set(newWidth);
  }

  private _handleDragEnd(): void {
    if (!this.isResizing() && !this._isListenersAttached) return;

    this.isResizing.set(false);
    this._isListenersAttached = false;

    document.removeEventListener('mousemove', this._boundOnDrag);
    document.removeEventListener('mouseup', this._boundOnDragEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save width to localStorage with error handling
    this._saveWidthToStorage();
  }

  private _saveWidthToStorage(): void {
    try {
      localStorage.setItem(LS.RIGHT_PANEL_WIDTH, this.currentWidth().toString());
    } catch (error) {
      console.warn('Failed to save right panel width to localStorage:', error);
    }
  }

  private _initializeWidth(): void {
    try {
      // Load saved width from localStorage or use default
      const savedWidth = readNumberLSBounded(
        LS.RIGHT_PANEL_WIDTH,
        RIGHT_PANEL_CONFIG.MIN_WIDTH,
        RIGHT_PANEL_CONFIG.MAX_WIDTH,
      );

      const width = savedWidth ?? RIGHT_PANEL_CONFIG.DEFAULT_WIDTH;

      // Additional validation
      if (!Number.isFinite(width) || width < RIGHT_PANEL_CONFIG.MIN_WIDTH) {
        console.warn('Invalid right panel width detected, using default');
        this.currentWidth.set(RIGHT_PANEL_CONFIG.DEFAULT_WIDTH);
        return;
      }

      this.currentWidth.set(width);
    } catch (error) {
      console.warn('Failed to initialize right panel width:', error);
      this.currentWidth.set(RIGHT_PANEL_CONFIG.DEFAULT_WIDTH);
    }
  }

  protected readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
}
