/* eslint-disable @typescript-eslint/naming-convention */
import {
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { NavItemComponent } from './nav-item/nav-item.component';
import { NavSectionComponent } from './nav-list/nav-list.component';
import { NavItem, NavGroupItem, NavWorkContextItem } from './magic-side-nav.model';
import { LS } from '../../core/persistence/storage-keys.const';
import { MagicNavConfigService } from './magic-nav-config.service';
import { readBoolLS, readNumberLSBounded } from '../../util/ls-util';
import { MatMenuModule } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { NavMatMenuComponent } from './nav-mat-menu/nav-mat-menu.component';

const COLLAPSED_WIDTH = 64;

@Component({
  selector: 'magic-side-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavItemComponent,
    NavSectionComponent,
    MatMenuModule,
    MatIcon,
    TranslatePipe,
    NavMatMenuComponent,
  ],
  templateUrl: './magic-side-nav.component.html',
  styleUrl: './magic-side-nav.component.scss',
  host: {
    '[style.width.px]': 'hostWidthSignal()',
    '[class.animate]': 'animateWidth()',
    '[class.resizing]': 'isResizing()',
  },
})
export class MagicSideNavComponent implements OnInit, OnDestroy {
  private readonly _sideNavConfigService = inject(MagicNavConfigService);
  // Use service's computed signal directly
  readonly config = this._sideNavConfigService.navConfig;

  activeWorkContextId = input<string | null>(null);

  // Externally controlled mobile overlay visibility
  mobileVisible = input<boolean | null>(null);
  mobileVisibleChange = output<boolean>();

  isFullMode = signal(true);
  isMobile = signal(false);
  showMobileMenu = signal(false);
  // Track expanded groups as array for better signal change detection
  expandedGroups = signal<string[]>([]);
  // Merge service-controlled and local expanded ids for reactive checks

  // Animate only for compactMode/fullMode toggle
  animateWidth = signal(false);
  private _animateTimeoutId: number | null = null;

  // Resize functionality
  currentWidth = signal(260);
  // Use values directly from config for min/max/thresholds
  isResizing = signal(false);
  startX = signal(0);
  startWidth = signal(0);

  // Computed values
  sidebarWidth = computed(() => {
    if (this.isMobile()) return 260;
    if (!this.isFullMode()) return COLLAPSED_WIDTH;
    return this.currentWidth();
  });

  // Host width as computed signal: don't reserve space on mobile overlay
  readonly hostWidthSignal = computed(() => (this.isMobile() ? 0 : this.sidebarWidth()));

  // Commonly used derived state for template readability
  readonly showText = computed(
    () => this.isFullMode() || (this.isMobile() && this.showMobileMenu()),
  );

  // Keep stable references for event listeners to ensure proper cleanup
  private readonly _onDrag: (event: MouseEvent) => void = (event: MouseEvent) =>
    this._handleDrag(event);
  private readonly _onDragEnd: () => void = () => this._handleDragEnd();

  constructor() {
    // Sync external mobile visibility input → internal state
    effect(() => {
      const desired = this.mobileVisible();
      if (desired !== null && this.isMobile()) {
        this.showMobileMenu.set(desired);
      }
    });

    // Emit mobile visible changes to parent while in mobile mode
    effect(() => {
      if (this.isMobile()) {
        this.mobileVisibleChange.emit(this.showMobileMenu());
      }
    });
  }

  ngOnDestroy(): void {
    if (this._animateTimeoutId != null) {
      window.clearTimeout(this._animateTimeoutId);
      this._animateTimeoutId = null;
    }
  }

  ngOnInit(): void {
    // Load saved fullMode/compactMode state or default to config value
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

    // Initialize expanded groups for non-service-managed groups
    // Projects and tags expansion is managed by the service
    const nextExpanded: string[] = [];
    this.expandedGroups.set(nextExpanded);

    this._checkScreenSize();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this._checkScreenSize();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isMobile() && this.showMobileMenu()) {
      const target = event.target as HTMLElement;
      const nav = document.querySelector('.nav-sidebar');
      const toggle = document.querySelector('.mobile-menu-toggle');

      if (nav && !nav.contains(target) && (!toggle || !toggle.contains(target as Node))) {
        this.showMobileMenu.set(false);
      }
    }
  }

  onNavKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      this._handleArrowNavigation(event);
    }
  }

  private _checkScreenSize(): void {
    const wasMobile = this.isMobile();
    const currentMobile = window.innerWidth < (this.config().mobileBreakpoint || 768);
    this.isMobile.set(currentMobile);

    if (wasMobile !== currentMobile) {
      if (currentMobile) {
        this.showMobileMenu.set(false);
      } else {
        this.isFullMode.set(this.config().fullModeByDefault);
      }
    }
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.showMobileMenu.update((show) => !show);
    } else {
      this._enableWidthAnimation();
      const newFullMode = !this.isFullMode();
      this.isFullMode.set(newFullMode);
      // Save fullMode/compactMode state to localStorage
      localStorage.setItem(LS.NAV_SIDEBAR_EXPANDED, newFullMode.toString());
      // handled internally
    }
  }

  toggleGroup(item: NavItem): void {
    if (item.type !== 'group' || !item.children) {
      return;
    }
    const groups = this.expandedGroups();
    if (groups.includes(item.id)) {
      this.expandedGroups.set(groups.filter((g) => g !== item.id));
    } else {
      this.expandedGroups.set([...groups, item.id]);
    }
  }

  isGroupExpanded(item: NavItem): boolean {
    // Use the service as the source of truth for expansion state
    if (item.id === 'projects') {
      return this._sideNavConfigService.isProjectsExpanded();
    } else if (item.id === 'tags') {
      return this._sideNavConfigService.isTagsExpanded();
    }
    // For other groups, fall back to local state
    return this.expandedGroups().includes(item.id);
  }

  onItemClick(item: NavItem): void {
    if (item.type === 'group') {
      // For projects and tags, let the service handle the toggle to avoid double-toggle
      if (item.id === 'projects' || item.id === 'tags') {
        if (item.action) {
          item.action(); // This will update the service state
        }
        return;
      }

      // For other groups, handle locally
      if (item.action) {
        item.action();
      }
      this.toggleGroup(item);
      return;
    }

    if (item.type === 'action') {
      item.action?.();
    }

    // Handle via service for actions/hrefs
    this._sideNavConfigService.onNavItemClick(item);

    if (this.isMobile()) {
      this.showMobileMenu.set(false);
    }
  }

  onDragDrop(
    groupItem: NavGroupItem,
    dropData: {
      items: NavWorkContextItem[];
      event: CdkDragDrop<string, string, NavWorkContextItem>;
    },
  ): void {
    const { items, event } = dropData;

    if (groupItem.id === 'projects') {
      this._sideNavConfigService.handleProjectDrop(items, event);
    } else if (groupItem.id === 'tags') {
      this._sideNavConfigService.handleTagDrop(items, event);
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
      this.config().position === 'right'
        ? this.startX() - event.clientX
        : event.clientX - this.startX();

    const potentialWidth = this.startWidth() + deltaX;
    const cfg = this.config();
    const collapseTh = cfg.collapseThreshold;
    const expandTh = cfg.expandThreshold;
    const minW = cfg.minWidth;
    const maxW = cfg.maxWidth;

    // Handle seamless mode transitions
    if (this.isFullMode()) {
      // Currently fullMode - check for compactMode threshold
      if (potentialWidth < collapseTh) {
        // Auto-switch to compactMode without releasing mouse
        this.isFullMode.set(false);
        // handled internally

        // Reset starting point for continued dragging from compactMode state
        this.startWidth.set(COLLAPSED_WIDTH);
        this.startX.set(event.clientX);

        // No visual feedback
        return;
      }

      // No visual feedback when approaching collapse threshold

      // Normal resize when fullMode
      const newWidth = Math.max(minW, Math.min(maxW, potentialWidth));

      this.currentWidth.set(newWidth);
    } else {
      // Currently compactMode - check for fullMode threshold
      const compactModeWidth = COLLAPSED_WIDTH;
      const draggedWidth = compactModeWidth + deltaX;

      if (draggedWidth > expandTh) {
        // Auto-switch to fullMode without releasing mouse
        this.isFullMode.set(true);
        const newWidth = expandTh + 20; // Start slightly beyond threshold
        this.currentWidth.set(newWidth);
        // handled internally

        // Reset starting point for continued dragging from fullMode state
        this.startWidth.set(this.currentWidth());
        this.startX.set(event.clientX);

        // No visual feedback
        return;
      }

      // Show visual feedback when approaching threshold
      // No visual feedback when approaching expand threshold
    }
  }

  private _handleDragEnd(): void {
    if (!this.isResizing()) return;

    this.isResizing.set(false);
    document.removeEventListener('mousemove', this._onDrag);
    document.removeEventListener('mouseup', this._onDragEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // No visual feedback to reset

    // Save width to localStorage (only save if fullMode)
    if (this.isFullMode()) {
      localStorage.setItem(LS.NAV_SIDEBAR_WIDTH, this.currentWidth().toString());
    }
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
    const nav = document.querySelector('.nav-sidebar');
    if (!nav) {
      return [];
    }

    // Get the sidebar toggle button first (if visible)
    const toggleButton = nav.querySelector('.sidebar-toggle') as HTMLElement;
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

  // Public method to focus the first nav entry (for keyboard shortcuts)
  focusFirstNavEntry(): void {
    const focusableElements = this._getFocusableNavElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  // Inline width binding via template replaces imperative DOM style updates
}
