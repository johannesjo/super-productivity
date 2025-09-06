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
import { SideNavItemComponent } from '../side-nav/side-nav-item/side-nav-item.component';
import { ContextMenuComponent } from '../../ui/context-menu/context-menu.component';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  svgIcon?: string; // For SVG icons like schedule
  route?: string; // Internal Angular route
  href?: string; // External link
  action?: () => void;
  children?: NavItem[];
  badge?: string | number;
  // For work context items (projects/tags)
  workContext?: WorkContextCommon;
  workContextType?: WorkContextType;
  defaultIcon?: string;
  // Additional buttons for navigation sections
  additionalButtons?: NavAdditionalButton[];
  // Context menu items
  contextMenuItems?: NavItem[];
}

export interface NavAdditionalButton {
  id: string;
  icon: string;
  tooltip?: string;
  action?: () => void;
  hidden?: boolean;
  contextMenu?: NavItem[];
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
    SideNavItemComponent,
    ContextMenuComponent,
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

  constructor() {
    // Effect to update sidebar width whenever signals change
    effect(() => {
      this.updateSidebarWidth();
    });

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

    console.log(
      '🔧 MagicSideNavComponent ngOnInit - expandedGroupIds:',
      this.expandedGroupIds,
    );
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
    if (item.children && item.children.length > 0) {
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
    // Use external expansion state if available, otherwise fall back to local state
    console.log(
      `🔍 isGroupExpanded(${item.id}) - expandedGroupIds:`,
      this.expandedGroupIds,
      'size:',
      this.expandedGroupIds?.size,
    );
    if (this.expandedGroupIds && this.expandedGroupIds.size > 0) {
      const result = this.expandedGroupIds.has(item.id);
      console.log(
        `🔍 isGroupExpanded(${item.id}):`,
        result,
        'from external expandedGroupIds:',
        Array.from(this.expandedGroupIds),
      );
      return result;
    }
    const result = this.expandedGroups().has(item.id);
    console.log(
      `🔍 isGroupExpanded(${item.id}):`,
      result,
      'from local expandedGroups:',
      Array.from(this.expandedGroups()),
    );
    return result;
  }

  onItemClick(item: NavItem): void {
    console.log(
      '🖱️ onItemClick called for:',
      item.id,
      'has children:',
      !!item.children?.length,
      'has action:',
      !!item.action,
    );
    if (item.children && item.children.length > 0) {
      // For items with children, call the action (which should be the expand/collapse handler)
      if (item.action) {
        console.log('🖱️ Calling item.action() for:', item.id);
        item.action();
      } else {
        // Only use local state if no external action is provided
        console.log('🖱️ No action found, using local toggleGroup for:', item.id);
        this.toggleGroup(item);
      }
    } else {
      if (item.action) {
        item.action();
      }
      this.itemClick.emit(item);

      if (this.isMobile()) {
        this.showMobileMenu.set(false);
      }
    }
  }

  // Resize functionality
  onResizeStart(event: MouseEvent): void {
    if (!this.config.resizable || this.isMobile()) return;

    this.isResizing.set(true);
    this.startX.set(event.clientX);
    this.startWidth.set(this.isExpanded() ? this.currentWidth() : 72);

    document.addEventListener('mousemove', this.handleDrag.bind(this));
    document.addEventListener('mouseup', this.handleDragEnd.bind(this));
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
        this.updateSidebarVisualFeedback('normal');
        return;
      }

      // Show visual feedback when approaching collapse threshold
      if (potentialWidth < this.collapseThreshold() + 20) {
        this.updateSidebarVisualFeedback('collapse');
      } else {
        this.updateSidebarVisualFeedback('normal');
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
        this.updateSidebarVisualFeedback('normal');
        return;
      }

      // Show visual feedback when approaching threshold
      if (draggedWidth > this.expandThreshold() - 20) {
        this.updateSidebarVisualFeedback('expand');
      } else {
        this.updateSidebarVisualFeedback('normal');
      }
    }
  }

  private handleDragEnd(): void {
    if (!this.isResizing()) return;

    this.isResizing.set(false);
    document.removeEventListener('mousemove', this.handleDrag.bind(this));
    document.removeEventListener('mouseup', this.handleDragEnd.bind(this));
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Reset visual feedback
    this.updateSidebarVisualFeedback('normal');

    // Save width to localStorage (only save if expanded)
    if (this.isExpanded()) {
      localStorage.setItem('nav-sidebar-width', this.currentWidth().toString());
    }
  }

  private updateSidebarWidth(): void {
    const sidebar = document.querySelector('.nav-sidebar') as HTMLElement;
    if (sidebar && !this.isMobile()) {
      if (this.isExpanded()) {
        sidebar.style.setProperty('width', `${this.currentWidth()}px`, 'important');
      } else {
        sidebar.style.setProperty('width', '72px', 'important');
      }
    }
  }

  private updateSidebarVisualFeedback(state: 'normal' | 'collapse' | 'expand'): void {
    const sidebar = document.querySelector('.nav-sidebar') as HTMLElement;
    if (!sidebar) return;

    // Remove all feedback classes
    sidebar.classList.remove('collapse-zone', 'expand-zone');

    // Add appropriate class based on state
    if (state === 'collapse') {
      sidebar.classList.add('collapse-zone');
    } else if (state === 'expand') {
      sidebar.classList.add('expand-zone');
    }
  }
}
