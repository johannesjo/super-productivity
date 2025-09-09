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

  isExpanded = signal(true);
  isMobile = signal(false);
  showMobileMenu = signal(false);
  // Track expanded groups as array for better signal change detection
  expandedGroups = signal<string[]>([]);
  // Merge service-controlled and local expanded ids for reactive checks

  // Animate only for collapsed/expanded toggle
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
    if (!this.isExpanded()) return COLLAPSED_WIDTH;
    return this.currentWidth();
  });

  // Host width as computed signal: don't reserve space on mobile overlay
  readonly hostWidthSignal = computed(() => (this.isMobile() ? 0 : this.sidebarWidth()));

  // Commonly used derived state for template readability
  readonly showText = computed(
    () => this.isExpanded() || (this.isMobile() && this.showMobileMenu()),
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
    // Load saved expansion state or default to config value
    const initialExpanded = readBoolLS(
      LS.NAV_SIDEBAR_EXPANDED,
      this.config().expandedByDefault,
    );
    this.isExpanded.set(initialExpanded);

    // Load saved width from localStorage or default
    const bounded = readNumberLSBounded(
      LS.NAV_SIDEBAR_WIDTH,
      this.config().minWidth,
      this.config().maxWidth,
    );
    this.currentWidth.set(bounded ?? this.config().defaultWidth);

    // Initialize expanded groups from stored flags (projects/tags)
    const nextExpanded: string[] = [];
    if (readBoolLS(LS.IS_PROJECT_LIST_EXPANDED, true)) {
      nextExpanded.push('projects');
    }
    if (readBoolLS(LS.IS_TAG_LIST_EXPANDED, true)) {
      nextExpanded.push('tags');
    }
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

  private _checkScreenSize(): void {
    const wasMobile = this.isMobile();
    const currentMobile = window.innerWidth < (this.config().mobileBreakpoint || 768);
    this.isMobile.set(currentMobile);

    if (wasMobile !== currentMobile) {
      if (currentMobile) {
        this.showMobileMenu.set(false);
      } else {
        this.isExpanded.set(this.config().expandedByDefault);
      }
    }
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.showMobileMenu.update((show) => !show);
    } else {
      this._enableWidthAnimation();
      const newExpanded = !this.isExpanded();
      this.isExpanded.set(newExpanded);
      // Save expansion state to localStorage
      localStorage.setItem(LS.NAV_SIDEBAR_EXPANDED, newExpanded.toString());
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
    return this.expandedGroups().includes(item.id);
  }

  onItemClick(item: NavItem): void {
    if (item.type === 'group') {
      // Allow external toggle handler if provided
      if (item.action) {
        item.action();
      }
      // Always reflect the toggle locally so UI responds immediately
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
    this.startWidth.set(this.isExpanded() ? this.currentWidth() : COLLAPSED_WIDTH);

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
    if (this.isExpanded()) {
      // Currently expanded - check for collapse threshold
      if (potentialWidth < collapseTh) {
        // Auto-collapse without releasing mouse
        this.isExpanded.set(false);
        // handled internally

        // Reset starting point for continued dragging from collapsed state
        this.startWidth.set(COLLAPSED_WIDTH);
        this.startX.set(event.clientX);

        // No visual feedback
        return;
      }

      // No visual feedback when approaching collapse threshold

      // Normal resize when expanded
      const newWidth = Math.max(minW, Math.min(maxW, potentialWidth));

      this.currentWidth.set(newWidth);
    } else {
      // Currently collapsed - check for expand threshold
      const collapsedWidth = COLLAPSED_WIDTH;
      const draggedWidth = collapsedWidth + deltaX;

      if (draggedWidth > expandTh) {
        // Auto-expand without releasing mouse
        this.isExpanded.set(true);
        const newWidth = expandTh + 20; // Start slightly beyond threshold
        this.currentWidth.set(newWidth);
        // handled internally

        // Reset starting point for continued dragging from expanded state
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

    // Save width to localStorage (only save if expanded)
    if (this.isExpanded()) {
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

  // Inline width binding via template replaces imperative DOM style updates
}
