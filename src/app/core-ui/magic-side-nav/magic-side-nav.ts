import {
  Component,
  computed,
  effect,
  HostListener,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SpNavItemComponent } from './nav-item/nav-item.component';
import { SpNavSectionComponent } from './nav-list/nav-list.component';
import { NavConfig, NavItem } from './magic-side-nav.model';

const COLLAPSED_WIDTH = 64;

const HOST_WIDTH = '[style.width.px]';
const HOST_ANIMATE = '[class.animate]';
const HOST_RESIZING = '[class.resizing]';

@Component({
  selector: 'magic-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, SpNavItemComponent, SpNavSectionComponent],
  templateUrl: './magic-side-nav.html',
  styleUrl: './magic-side-nav.scss',
  host: {
    [HOST_WIDTH]: 'hostWidth()',
    [HOST_ANIMATE]: 'hostAnimate()',
    [HOST_RESIZING]: 'hostResizing()',
  },
})
export class MagicSideNavComponent implements OnInit, OnDestroy {
  config = input<NavConfig>({
    items: [],
    expandedByDefault: true,
    showLabels: true,
    mobileBreakpoint: 768,
    position: 'left',
    theme: 'light',
    resizable: false,
    minWidth: 200,
    maxWidth: 400,
    defaultWidth: 260,
    collapseThreshold: 150,
    expandThreshold: 180,
  });

  expandedGroupIds = input<Set<string>>(new Set());
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();
  expandedChange = output<boolean>();
  widthChange = output<number>();
  // Externally controlled mobile overlay visibility
  mobileVisible = input<boolean | null>(null);
  mobileVisibleChange = output<boolean>();

  isExpanded = signal(true);
  isMobile = signal(false);
  showMobileMenu = signal(false);
  expandedGroups = signal(new Set<string>());
  // Visual feedback state for resizing thresholds
  resizeState = signal<'normal' | 'collapse' | 'expand'>('normal');
  // Animate only for collapsed/expanded toggle
  animateWidth = signal(false);
  private _animateTimeoutId: number | null = null;

  // Resize functionality
  currentWidth = signal(260);
  minWidth = signal(200);
  maxWidth = signal(400);
  isResizing = signal(false);
  startX = signal(0);
  startWidth = signal(0);
  collapseThreshold = signal(150);
  expandThreshold = signal(180);

  // Computed values
  sidebarWidth = computed(() => {
    if (this.isMobile()) return 260;
    if (!this.isExpanded()) return COLLAPSED_WIDTH;
    return this.currentWidth();
  });

  // Animate the host width so layout adjusts smoothly
  hostWidth(): number {
    // On mobile, don't reserve layout space; use fixed overlay instead
    if (this.isMobile()) {
      return 0;
    }
    return this.sidebarWidth();
  }

  hostAnimate(): boolean {
    return this.animateWidth();
  }

  hostResizing(): boolean {
    return this.isResizing();
  }

  // Keep stable references for event listeners to ensure proper cleanup
  private readonly _onDrag: (event: MouseEvent) => void = (event: MouseEvent) =>
    this._handleDrag(event);
  private readonly _onDragEnd: () => void = () => this._handleDragEnd();

  constructor() {
    // Effect to emit width changes
    effect(() => {
      this.widthChange.emit(this.sidebarWidth());
    });

    // Sync external mobile visibility input → internal state
    effect(() => {
      const desired = this.mobileVisible();
      if (desired !== null && this.isMobile()) {
        this.showMobileMenu.set(!!desired);
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
    const savedExpanded = localStorage.getItem('nav-sidebar-expanded');
    const initialExpanded =
      savedExpanded !== null
        ? savedExpanded === 'true'
        : (this.config().expandedByDefault ?? true);

    this.isExpanded.set(initialExpanded);
    this.currentWidth.set(this.config().defaultWidth ?? 260);
    this.minWidth.set(this.config().minWidth ?? 200);
    this.maxWidth.set(this.config().maxWidth ?? 400);
    this.collapseThreshold.set(this.config().collapseThreshold ?? 150);
    this.expandThreshold.set(this.config().expandThreshold ?? 180);

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('nav-sidebar-width');
    if (savedWidth) {
      const width = Math.max(
        this.minWidth(),
        Math.min(this.maxWidth(), parseInt(savedWidth)),
      );
      this.currentWidth.set(width);
    }

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
        this.isExpanded.set(this.config().expandedByDefault ?? true);
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
      localStorage.setItem('nav-sidebar-expanded', newExpanded.toString());
      this.expandedChange.emit(newExpanded);
    }
  }

  toggleGroup(item: NavItem): void {
    if (item.type === 'group' && item.children && item.children.length > 0) {
      this.expandedGroups.update((groups) => {
        const newGroups = new Set(groups);
        if (newGroups.has(item.id)) {
          newGroups.delete(item.id);
        } else {
          newGroups.add(item.id);
        }
        return newGroups;
      });
    }
  }

  isGroupExpanded(item: NavItem): boolean {
    if (item.type !== 'group') return false;
    // Prefer external expansion state for known groups, but fall back to local for others (e.g., Help)
    if (this.expandedGroupIds && this.expandedGroupIds().size > 0) {
      if (this.expandedGroupIds().has(item.id)) {
        return true;
      }
      // If not controlled externally, use local state
    }
    return this.expandedGroups().has(item.id);
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

    // Emit to parent for external handling (e.g., href open)
    this.itemClick.emit(item);

    if (this.isMobile()) {
      this.showMobileMenu.set(false);
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

    // Handle seamless mode transitions
    if (this.isExpanded()) {
      // Currently expanded - check for collapse threshold
      if (potentialWidth < this.collapseThreshold()) {
        // Auto-collapse without releasing mouse
        this.isExpanded.set(false);
        this.expandedChange.emit(this.isExpanded());

        // Reset starting point for continued dragging from collapsed state
        this.startWidth.set(COLLAPSED_WIDTH);
        this.startX.set(event.clientX);

        // Visual feedback
        this.resizeState.set('normal');
        return;
      }

      // Show visual feedback when approaching collapse threshold
      if (potentialWidth < this.collapseThreshold() + 20) {
        this.resizeState.set('collapse');
      } else {
        this.resizeState.set('normal');
      }

      // Normal resize when expanded
      const newWidth = Math.max(
        this.minWidth(),
        Math.min(this.maxWidth(), potentialWidth),
      );

      this.currentWidth.set(newWidth);
    } else {
      // Currently collapsed - check for expand threshold
      const collapsedWidth = COLLAPSED_WIDTH;
      const draggedWidth = collapsedWidth + deltaX;

      if (draggedWidth > this.expandThreshold()) {
        // Auto-expand without releasing mouse
        this.isExpanded.set(true);
        const newWidth = this.expandThreshold() + 20; // Start slightly beyond threshold
        this.currentWidth.set(newWidth);
        this.expandedChange.emit(this.isExpanded());

        // Reset starting point for continued dragging from expanded state
        this.startWidth.set(this.currentWidth());
        this.startX.set(event.clientX);

        // Visual feedback
        this.resizeState.set('normal');
        return;
      }

      // Show visual feedback when approaching threshold
      if (draggedWidth > this.expandThreshold() - 20) {
        this.resizeState.set('expand');
      } else {
        this.resizeState.set('normal');
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

    // Reset visual feedback
    this.resizeState.set('normal');

    // Save width to localStorage (only save if expanded)
    if (this.isExpanded()) {
      localStorage.setItem('nav-sidebar-width', this.currentWidth().toString());
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
