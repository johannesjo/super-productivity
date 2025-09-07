import {
  Component,
  Input,
  HostListener,
  signal,
  computed,
  effect,
  output,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatMenu,
  MatMenuContent,
  MatMenuItem,
  MatMenuTrigger,
} from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import {
  WorkContextCommon,
  WorkContextType,
} from '../../features/work-context/work-context.model';
import { ContextMenuComponent } from '../../ui/context-menu/context-menu.component';
import { SpNavItemComponent } from './nav-item/nav-item.component';
import { SpNavSectionComponent } from './nav-list/nav-list.component';

export type NavItem =
  | NavSeparatorItem
  | NavWorkContextItem
  | NavRouteItem
  | NavHrefItem
  | NavActionItem
  | NavGroupItem;

export interface NavBaseItem {
  id: string;
  label?: string;
  icon?: string;
  svgIcon?: string;
  badge?: string | number;
}

export interface NavSeparatorItem extends NavBaseItem {
  type: 'separator';
}

export interface NavWorkContextItem extends NavBaseItem {
  type: 'workContext';
  label: string;
  icon: string;
  route: string;
  workContext: WorkContextCommon;
  workContextType: WorkContextType;
  defaultIcon: string;
}

export interface NavRouteItem extends NavBaseItem {
  type: 'route';
  label: string;
  icon: string;
  route: string;
}

export interface NavHrefItem extends NavBaseItem {
  type: 'href';
  label: string;
  icon: string;
  href: string;
}

export interface NavActionItem extends NavBaseItem {
  type: 'action';
  label: string;
  icon: string;
  action: () => void;
}

export interface NavContextItem {
  id: string;
  label: string;
  icon: string;
  svgIcon?: string;
  action?: () => void;
}

export interface NavGroupItem extends NavBaseItem {
  type: 'group';
  label: string;
  icon: string;
  children: NavItem[];
  additionalButtons?: NavAdditionalButton[];
  contextMenuItems?: NavContextItem[];
  action?: () => void; // optional external toggle logic
}

export interface NavAdditionalButton {
  id: string;
  icon: string;
  tooltip?: string;
  action?: () => void;
  hidden?: boolean;
  contextMenu?: NavContextItem[];
}

export interface NavConfig {
  items: NavItem[];
  expandedByDefault?: boolean;
  showLabels?: boolean;
  mobileBreakpoint?: number;
  position?: 'left' | 'right';
  theme?: 'light' | 'dark';
  resizable?: boolean;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  collapseThreshold?: number;
  expandThreshold?: number;
}

@Component({
  selector: 'magic-side-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
    TranslatePipe,
    ContextMenuComponent,
    SpNavItemComponent,
    SpNavSectionComponent,
  ],
  templateUrl: './magic-side-nav.html',
  styleUrl: './magic-side-nav.scss',
})
export class MagicSideNavComponent implements OnInit {
  @Input() config: NavConfig = {
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
  };

  @Input() expandedGroupIds: Set<string> = new Set();
  @Input() activeWorkContextId: string | null = null;

  itemClick = output<NavItem>();
  expandedChange = output<boolean>();
  widthChange = output<number>();

  isExpanded = signal(true);
  isMobile = signal(false);
  showMobileMenu = signal(false);
  expandedGroups = signal(new Set<string>());
  // Visual feedback state for resizing thresholds
  resizeState = signal<'normal' | 'collapse' | 'expand'>('normal');

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
    if (!this.isExpanded()) return 72;
    return this.currentWidth();
  });

  // Keep stable references for event listeners to ensure proper cleanup
  private readonly onDrag: (event: MouseEvent) => void = (event: MouseEvent) =>
    this.handleDrag(event);
  private readonly onDragEnd: () => void = () => this.handleDragEnd();

  constructor() {
    // Effect to emit width changes
    effect(() => {
      this.widthChange.emit(this.sidebarWidth());
    });
  }

  ngOnInit(): void {
    // Load saved expansion state or default to config value
    const savedExpanded = localStorage.getItem('nav-sidebar-expanded');
    const initialExpanded =
      savedExpanded !== null
        ? savedExpanded === 'true'
        : (this.config.expandedByDefault ?? true);

    this.isExpanded.set(initialExpanded);
    this.currentWidth.set(this.config.defaultWidth ?? 260);
    this.minWidth.set(this.config.minWidth ?? 200);
    this.maxWidth.set(this.config.maxWidth ?? 400);
    this.collapseThreshold.set(this.config.collapseThreshold ?? 150);
    this.expandThreshold.set(this.config.expandThreshold ?? 180);

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('nav-sidebar-width');
    if (savedWidth) {
      const width = Math.max(
        this.minWidth(),
        Math.min(this.maxWidth(), parseInt(savedWidth)),
      );
      this.currentWidth.set(width);
    }

    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkScreenSize();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isMobile() && this.showMobileMenu()) {
      const target = event.target as HTMLElement;
      const nav = document.querySelector('.nav-sidebar');
      const toggle = document.querySelector('.mobile-menu-toggle');

      if (nav && !nav.contains(target) && toggle && !toggle.contains(target)) {
        this.showMobileMenu.set(false);
      }
    }
  }

  private checkScreenSize(): void {
    const wasMobile = this.isMobile();
    const currentMobile = window.innerWidth < (this.config.mobileBreakpoint || 768);
    this.isMobile.set(currentMobile);

    if (wasMobile !== currentMobile) {
      if (currentMobile) {
        this.showMobileMenu.set(false);
      } else {
        this.isExpanded.set(this.config.expandedByDefault ?? true);
      }
    }
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.showMobileMenu.update((show) => !show);
    } else {
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
    if (this.expandedGroupIds && this.expandedGroupIds.size > 0) {
      if (this.expandedGroupIds.has(item.id)) {
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
      } else {
        this.toggleGroup(item);
      }
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
    if (!this.config.resizable || this.isMobile()) return;

    this.isResizing.set(true);
    this.startX.set(event.clientX);
    this.startWidth.set(this.isExpanded() ? this.currentWidth() : 72);

    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.onDragEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    event.preventDefault();
  }

  private handleDrag(event: MouseEvent): void {
    if (!this.isResizing()) return;

    const deltaX =
      this.config.position === 'right'
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
        this.startWidth.set(72);
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
      const collapsedWidth = 72;
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

  private handleDragEnd(): void {
    if (!this.isResizing()) return;

    this.isResizing.set(false);
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.onDragEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Reset visual feedback
    this.resizeState.set('normal');

    // Save width to localStorage (only save if expanded)
    if (this.isExpanded()) {
      localStorage.setItem('nav-sidebar-width', this.currentWidth().toString());
    }
  }

  // Inline width binding via template replaces imperative DOM style updates
}
