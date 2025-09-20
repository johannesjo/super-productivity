/* eslint-disable @typescript-eslint/naming-convention */
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavItemComponent } from './nav-item/nav-item.component';
import { NavListTreeComponent } from './nav-list/nav-list-tree.component';
import { NavItem } from './magic-side-nav.model';
import { LS } from '../../core/persistence/storage-keys.const';
import { MagicNavConfigService } from './magic-nav-config.service';
import { lsSetItem, readBoolLS, readNumberLSBounded } from '../../util/ls-util';
import { MatMenuModule } from '@angular/material/menu';
import { NavMatMenuComponent } from './nav-mat-menu/nav-mat-menu.component';
import { TaskService } from '../../features/tasks/task.service';
import { LayoutService } from '../layout/layout.service';
import { magicSideNavAnimations } from './magic-side-nav.animations';

const COLLAPSED_WIDTH = 64;
const MOBILE_NAV_WIDTH = 300;

@Component({
  selector: 'magic-side-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavItemComponent,
    NavListTreeComponent,
    MatMenuModule,
    NavMatMenuComponent,
  ],
  templateUrl: './magic-side-nav.component.html',
  styleUrl: './magic-side-nav.component.scss',
  host: {
    '[style.width.px]': 'hostWidthSignal()',
    '[class.animate]': 'animateWidth()',
    '[class.resizing]': 'isResizing()',
  },
  animations: magicSideNavAnimations,
})
export class MagicSideNavComponent implements OnInit, OnDestroy {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _sideNavConfigService = inject(MagicNavConfigService);
  private readonly _taskService = inject(TaskService);
  private readonly _layoutService = inject(LayoutService);
  // Use service's computed signal directly
  readonly config = this._sideNavConfigService.navConfig;

  activeWorkContextId = input<string | null>(null);

  // Externally controlled mobile overlay visibility
  mobileVisibleChange = output<boolean>();

  isFullMode = signal(true);
  isMobile = signal(false);
  showMobileMenuOverlay = signal(false);

  // Animate only for compactMode/fullMode toggle
  animateWidth = signal(false);
  private _animateTimeoutId: number | null = null;

  // Resize functionality
  currentWidth = signal(MOBILE_NAV_WIDTH);
  // Use values directly from config for min/max/thresholds
  isResizing = signal(false);
  startX = signal(0);
  startWidth = signal(0);

  // Computed values
  sidenavWidth = computed(() => {
    if (this.isMobile()) return MOBILE_NAV_WIDTH;
    if (!this.isFullMode()) return COLLAPSED_WIDTH;
    return this.currentWidth();
  });

  // Host width as computed signal: don't reserve space on mobile overlay
  readonly hostWidthSignal = computed(() => (this.isMobile() ? 0 : this.sidenavWidth()));

  // Commonly used derived state for template readability
  readonly showText = computed(() => this.isFullMode() || this.isMobile());

  // Keep stable references for event listeners to ensure proper cleanup
  private readonly _onDrag: (event: MouseEvent) => void = (event: MouseEvent) =>
    this._handleDrag(event);
  private readonly _onDragEnd: () => void = () => this._handleDragEnd();

  constructor() {
    // Emit mobile visible changes to parent while in mobile mode
    effect(() => {
      if (this.isMobile()) {
        this.mobileVisibleChange.emit(this.showMobileMenuOverlay());
      }
    });

    effect(() => {
      const isFullMode = this.isFullMode();
      if (!this.isMobile()) {
        lsSetItem(LS.NAV_SIDEBAR_EXPANDED, isFullMode.toString());
      }
    });

    effect(() => {
      const width = this.currentWidth();
      if (!this.isMobile()) {
        lsSetItem(LS.NAV_SIDEBAR_WIDTH, width.toString());
      }
    });

    // Listen for focus trigger from LayoutService
    effect(() => {
      const trigger = this._layoutService.focusSideNavTrigger();
      if (trigger > 0) {
        // Small delay to ensure DOM is ready
        window.setTimeout(() => {
          this.focusFirstNavEntry();
        });
      }
    });

    const resizeListener = (): void => this._checkScreenSize();
    window.addEventListener('resize', resizeListener);
    this._destroyRef.onDestroy(() => {
      window.removeEventListener('resize', resizeListener);
    });
  }

  ngOnDestroy(): void {
    if (this._animateTimeoutId != null) {
      window.clearTimeout(this._animateTimeoutId);
      this._animateTimeoutId = null;
    }
  }

  ngOnInit(): void {
    // Check screen size first to set mobile state
    this._checkScreenSize();

    // Persisted state is only relevant for desktop when bottom nav is not visible
    const isBottomNavVisible = this._layoutService.isXs();
    if (!isBottomNavVisible) {
      // Load saved fullMode/compactMode state
      const initialFullMode = readBoolLS(
        LS.NAV_SIDEBAR_EXPANDED,
        this.config().fullModeByDefault,
      );
      this.isFullMode.set(initialFullMode);

      // Load saved width from localStorage or default
      const bounded = readNumberLSBounded(
        LS.NAV_SIDEBAR_WIDTH,
        this.config().minWidth,
        this.config().maxWidth,
      );
      this.currentWidth.set(bounded ?? this.config().defaultWidth);
    } else {
      // Use defaults for mobile; do not apply persisted desktop state
      this.isFullMode.set(this.config().fullModeByDefault);
      this.currentWidth.set(this.config().defaultWidth);
    }
  }

  onNavKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      this._handleArrowNavigation(event);
    } else if (event.key === 'Escape') {
      this._handleEscapeKey(event);
    }
  }

  private _checkScreenSize(): void {
    const wasMobile = this.isMobile();
    const currentMobile = window.innerWidth < this.config().mobileBreakpoint;
    this.isMobile.set(currentMobile);

    if (wasMobile !== currentMobile && currentMobile) {
      // Switching to mobile - close overlay but preserve fullMode preference
      this.showMobileMenuOverlay.set(false);
    }
  }

  toggleMobileNav(): void {
    this.showMobileMenuOverlay.update((show) => !show);
  }

  toggleSideNavMode(): void {
    this._enableWidthAnimation();
    const newFullMode = !this.isFullMode();
    this.isFullMode.set(newFullMode);
  }

  isGroupExpanded(item: NavItem): boolean {
    // Use the service as the source of truth for all expansion state
    if (item.id === 'projects') {
      return this._sideNavConfigService.isProjectsExpanded();
    } else if (item.id === 'tags') {
      return this._sideNavConfigService.isTagsExpanded();
    }
    // For other groups, default to expanded (or extend service to manage all groups)
    return true;
  }

  onItemClick(item: NavItem): void {
    if (item.type === 'tree') {
      // All groups now handled consistently through service
      if (item.action) {
        item.action();
      }
      return;
    }

    if (item.type === 'action') {
      item.action?.();
    }

    if (item.type === 'plugin') {
      item.action?.();
    }

    // Handle via service for actions/hrefs
    this._sideNavConfigService.onNavItemClick(item);

    if (this.isMobile()) {
      this.showMobileMenuOverlay.set(false);
    }
  }

  // Resize functionality
  onResizeStart(event: MouseEvent): void {
    if (!this.config().resizable || this.isMobile()) return;

    this.isResizing.set(true);
    this.startX.set(event.clientX);
    this.startWidth.set(this.isFullMode() ? this.currentWidth() : COLLAPSED_WIDTH);

    document.addEventListener('mousemove', this._onDrag);
    document.addEventListener('mouseup', this._onDragEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    event.preventDefault();
  }

  private _handleDrag(event: MouseEvent): void {
    if (!this.isResizing()) return;

    const deltaX =
      // this.config().position === 'right'
      //   ? this.startX() - event.clientX
      event.clientX - this.startX();

    const potentialWidth = this.startWidth() + deltaX;
    const { collapseThreshold, expandThreshold, minWidth, maxWidth } = this.config();

    // Handle seamless mode transitions
    if (this.isFullMode()) {
      // Currently fullMode - check for compactMode threshold
      if (potentialWidth < collapseThreshold) {
        // Auto-switch to compactMode without releasing mouse
        this.isFullMode.set(false);

        // Reset starting point for continued dragging from compactMode state
        this.startWidth.set(COLLAPSED_WIDTH);
        this.startX.set(event.clientX);

        return;
      }

      // Normal resize when fullMode
      const newWidth = Math.max(minWidth, Math.min(maxWidth, potentialWidth));
      this.currentWidth.set(newWidth);
    } else {
      // Currently compactMode - check for fullMode threshold
      const compactModeWidth = COLLAPSED_WIDTH;
      const draggedWidth = compactModeWidth + deltaX;

      if (draggedWidth > expandThreshold) {
        // Auto-switch to fullMode without releasing mouse
        this.isFullMode.set(true);
        const newWidth = expandThreshold + 20; // Start slightly beyond threshold
        this.currentWidth.set(newWidth);

        // Reset starting point for continued dragging from fullMode state
        this.startWidth.set(this.currentWidth());
        this.startX.set(event.clientX);

        return;
      }
    }
  }

  private _handleDragEnd(): void {
    if (!this.isResizing()) return;

    this.isResizing.set(false);
    document.removeEventListener('mousemove', this._onDrag);
    document.removeEventListener('mouseup', this._onDragEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Final width already persisted continuously; no-op here
  }

  private _enableWidthAnimation(): void {
    if (this._animateTimeoutId != null) {
      window.clearTimeout(this._animateTimeoutId);
      this._animateTimeoutId = null;
    }
    this.animateWidth.set(true);
    // Slightly longer than --transition-duration-m (225ms) to ensure cleanup
    this._animateTimeoutId = window.setTimeout(() => {
      this.animateWidth.set(false);
      this._animateTimeoutId = null;
    }, 300);
  }

  private _handleArrowNavigation(event: KeyboardEvent): void {
    // Get all focusable elements in the nav
    const focusableElements = this._getFocusableNavElements();

    if (focusableElements.length === 0) {
      return;
    }

    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.indexOf(activeElement);

    event.preventDefault();
    event.stopPropagation();

    let nextIndex: number;
    if (currentIndex === -1) {
      // No nav element focused, focus first element
      nextIndex = 0;
    } else if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % focusableElements.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    } else {
      return;
    }

    focusableElements[nextIndex]?.focus();
  }

  private _getFocusableNavElements(): HTMLElement[] {
    const nav = document.querySelector('.nav-sidenav');
    if (!nav) {
      return [];
    }

    // Get the sidenav toggle button first (if visible)
    const toggleButton = nav.querySelector('.mode-toggle') as HTMLElement;
    const focusableElements: HTMLElement[] = [];

    if (toggleButton) {
      const styles = window.getComputedStyle(toggleButton);
      if (styles.display !== 'none' && styles.visibility !== 'hidden') {
        toggleButton.setAttribute('tabindex', '0');
        focusableElements.push(toggleButton);
      }
    }

    // Get all nav-link elements (these are the actual clickable items)
    // Also get any mat-menu-item elements which are used for nav items
    const selector = '.nav-link, [mat-menu-item]';
    const allElements = Array.from(nav.querySelectorAll(selector)) as HTMLElement[];

    // Filter to only get elements within the nav-list
    const navList = nav.querySelector('.nav-list');
    if (!navList) {
      return focusableElements; // Return just the toggle if no nav list
    }

    const navListElements = allElements.filter((el) => {
      // Make sure the element is inside nav-list
      const isInNavList = navList.contains(el);

      // Check if it's actually interactive (button or link)
      const tagName = el.tagName.toLowerCase();
      const isInteractive = tagName === 'button' || tagName === 'a';

      // Check visibility
      const styles = window.getComputedStyle(el);
      const isVisible =
        styles.display !== 'none' &&
        styles.visibility !== 'hidden' &&
        styles.opacity !== '0';

      // Exclude settings buttons and other non-navigation buttons
      const isSettingsBtn = el.classList.contains('additional-btn');

      return isInNavList && isInteractive && isVisible && !isSettingsBtn;
    });

    // Set tabindex on nav list elements to make them focusable
    navListElements.forEach((el) => {
      if (!el.hasAttribute('tabindex') || el.getAttribute('tabindex') === '-1') {
        el.setAttribute('tabindex', '0');
      }
    });

    // Combine toggle button (if present) with nav list elements
    const allFocusable = [...focusableElements, ...navListElements];

    return allFocusable;
  }

  private _handleEscapeKey(event: KeyboardEvent): void {
    // Unfocus any currently focused navigation element
    const activeElement = document.activeElement as HTMLElement;
    const navSidebar = document.querySelector('.nav-sidenav');

    // Check if the currently focused element is within the navigation
    if (navSidebar && navSidebar.contains(activeElement)) {
      event.preventDefault();
      event.stopPropagation();

      // Unfocus the navigation element
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }

      // Focus the first task if available
      setTimeout(() => {
        this._taskService.focusFirstTaskIfVisible();
      }, 10);
    }
  }

  // Public method to focus the first nav entry (for keyboard shortcuts)
  focusFirstNavEntry(): void {
    if (this.isMobile() && !this.showMobileMenuOverlay()) {
      this.showMobileMenuOverlay.set(true);
      setTimeout(() => {
        this._focusFirstNavElement();
      });
      return;
    }

    this._focusFirstNavElement();
  }

  private _focusFirstNavElement(): void {
    const focusableElements = this._getFocusableNavElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }
}
