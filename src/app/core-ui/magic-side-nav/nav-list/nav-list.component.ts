import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavGroupItem, NavItem, NavWorkContextItem } from '../magic-side-nav.model';
import { DRAG_DELAY_FOR_TOUCH_LONGER } from '../../../app.constants';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { standardListAnimation } from '../../../ui/animations/standard-list.ani';
import { expandFadeAnimation } from '../../../ui/animations/expand.ani';
import { MagicNavConfigService } from '../magic-nav-config.service';
import { T } from '../../../t.const';

@Component({
  selector: 'nav-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatMenuModule,
    TranslatePipe,
    CdkDropList,
    CdkDrag,
    NavItemComponent,
  ],
  templateUrl: './nav-list.component.html',
  styleUrl: './nav-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation],
})
export class NavSectionComponent {
  private readonly _navConfigService = inject(MagicNavConfigService);

  item = input.required<NavGroupItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();
  dragDrop = output<{
    items: NavWorkContextItem[];
    event: CdkDragDrop<any, any, NavWorkContextItem>;
  }>();

  folderDrop = output<{
    event: CdkDragDrop<any, any, any>;
  }>();

  readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
  readonly DRAG_DELAY_FOR_TOUCH_LONGER = DRAG_DELAY_FOR_TOUCH_LONGER;
  readonly T = T;

  // Access to service methods and data for visibility menu
  readonly allProjectsExceptInbox = this._navConfigService.allProjectsExceptInbox;
  readonly hasAnyProjects = this._navConfigService.hasAnyProjects;
  readonly hasAnyTags = this._navConfigService.hasAnyTags;

  onHeaderClick(): void {
    this.itemClick.emit(this.item());
  }

  onChildClick(child: NavItem): void {
    this.itemClick.emit(child);
  }

  toggleProjectVisibility(projectId: string): void {
    this._navConfigService.toggleProjectVisibility(projectId);
  }

  createNewProject(): void {
    this._navConfigService.createNewProject();
  }

  createNewTag(): void {
    this._navConfigService.createNewTag();
  }

  shouldShowEmptyState(): boolean {
    const itemId = this.item().id;
    if (itemId === 'projects') {
      return !this.hasAnyProjects();
    } else if (itemId === 'tags') {
      return !this.hasAnyTags();
    }
    return false;
  }

  isHeaderDropZone(): boolean {
    return this.item().id?.startsWith('folder-') || this.item().id === 'projects';
  }

  onDrop(event: CdkDragDrop<any, any, any>): void {
    // Handle cross-container drops (moving projects between folders)
    if (event.previousContainer !== event.container) {
      this.folderDrop.emit({ event });
      return;
    }

    // Early exit if no actual movement within same container
    if (event.currentIndex === event.previousIndex) {
      return;
    }

    // Filter work context items once
    const workContextItems =
      this.item().children?.filter(
        (child): child is NavWorkContextItem => child.type === 'workContext',
      ) || [];

    // Only emit if there are actually work context items to reorder
    if (workContextItems.length > 0) {
      this.dragDrop.emit({ items: workContextItems, event });
    }
  }

  onFolderDrop(event: CdkDragDrop<any, any, any>): void {
    // Handle dropping projects into folders
    this.folderDrop.emit({ event });
  }

  getConnectedDropLists(): string[] {
    // Create a comprehensive list of all possible drop zones
    const dropLists: string[] = [];

    // Always include the main projects header and list
    dropLists.push('header-projects', 'list-projects');

    // Add all child folder drop zones - both their list and the folder drop zone itself
    const childFolders =
      this.item().children?.filter(
        (child) => child.type === 'group' && child.id?.startsWith('folder-'),
      ) || [];

    for (const folder of childFolders) {
      dropLists.push(
        `header-${folder.id}`,
        `list-${folder.id}`,
        `folder-drop-${folder.id}`, // Add the folder drop zone itself
      );
    }

    // If this is a folder, also add its own header and list
    if (this.item().id?.startsWith('folder-')) {
      dropLists.push(`header-${this.item().id}`, `list-${this.item().id}`);
    }

    // Remove duplicates and return
    return [...new Set(dropLists)];
  }

  canDropOnHeader = (drag: any, drop: any): boolean => {
    // Allow dropping projects on folder headers or the projects header
    const draggedItem = drag.data;
    const targetItem = drop.data;

    return (
      draggedItem?.type === 'workContext' &&
      (targetItem?.id?.startsWith('folder-') || targetItem?.id === 'projects')
    );
  };

  onHeaderDrop(event: CdkDragDrop<any, any, any>): void {
    // Handle dropping projects onto folder headers
    this.folderDrop.emit({ event });
  }
}
