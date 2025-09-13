import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavGroupItem, NavItem } from '../magic-side-nav.model';
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
    NavItemComponent,
  ],
  templateUrl: './nav-list.component.html',
  styleUrl: './nav-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [standardListAnimation, expandFadeAnimation],
})
export class NavSectionComponent implements AfterViewInit, OnDestroy {
  private readonly _navConfigService = inject(MagicNavConfigService);
  private readonly _elementRef = inject(ElementRef);

  private _cleanupFunctions: Array<() => void> = [];
  private _lastItemsCount = 0;
  private _isViewInitialized = false;
  private _dropHandled = false;

  constructor() {
    // Watch for changes in children and re-setup drag handlers
    effect(() => {
      const currentItemsCount = this.item().children?.length || 0;
      const isExpanded = this.isExpanded();

      // Only refresh if view is initialized and something has changed
      if (
        this._isViewInitialized &&
        (currentItemsCount !== this._lastItemsCount || isExpanded !== this._wasExpanded)
      ) {
        // Use setTimeout to avoid issues with signal updates
        setTimeout(() => {
          this._refreshDragAndDrop();
          this._lastItemsCount = currentItemsCount;
          this._wasExpanded = isExpanded;
        }, 10);
      }
    });
  }

  private _wasExpanded = false;

  item = input.required<NavGroupItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();
  projectMove = output<{
    projectId: string;
    targetFolderId: string | null;
    targetIndex?: number;
  }>();

  folderMove = output<{
    folderId: string;
    targetParentFolderId: string | null;
    targetIndex?: number;
  }>();

  private _dropIndicatorEl: HTMLElement | null = null;
  private _indicatorTargetEl: HTMLElement | null = null;
  private _indicatorEdge: 'top' | 'bottom' | null = null;

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

  ngAfterViewInit(): void {
    // Use a small delay to ensure DOM is fully ready
    setTimeout(() => {
      this._setupDragAndDrop();
      this._lastItemsCount = this.item().children?.length || 0;
      this._wasExpanded = this.isExpanded();
      this._isViewInitialized = true;
    }, 0);
  }

  ngOnDestroy(): void {
    this._cleanupFunctions.forEach((cleanup) => cleanup());
    this._removeDropIndicator();
  }

  private _refreshDragAndDrop(): void {
    // Clean up existing handlers first
    this._cleanupFunctions.forEach((cleanup) => cleanup());
    this._cleanupFunctions = [];

    // Re-setup drag and drop
    this._setupDragAndDrop();
  }

  private _setupDragAndDrop(): void {
    const element = this._elementRef.nativeElement;

    // Set up auto-scroll
    const cleanupAutoScroll = autoScrollForElements({
      element: element.closest('.nav-sidenav') || element,
    });
    this._cleanupFunctions.push(cleanupAutoScroll);

    // Set up drag and drop for projects
    this._setupProjectDragDrop(element);

    // Set up drag and drop for folders
    this._setupFolderDragDrop(element);

    // Set up folder drop zones
    this._setupFolderDropZones(element);

    // Set up drop zone for empty areas (to append at the end)
    this._setupEmptyAreaDropZone(element);
  }

  private _setupProjectDragDrop(element: HTMLElement): void {
    // Find only direct child project elements (not nested ones in sub-folders)
    const navChildren = element.querySelector(':scope > .nav-children');
    if (!navChildren) return;

    // Only get direct children that are project items, not nested nav-list components
    const directChildren = Array.from(navChildren.children);
    const projectElements = directChildren.filter(
      (child) =>
        child.hasAttribute('data-project-id') &&
        child.classList.contains('nav-child-item'),
    );

    console.log(
      '🔧 Setting up drag for',
      projectElements.length,
      'projects in container:',
      this.item().id,
    );

    projectElements.forEach((projectEl: Element, index) => {
      const htmlEl = projectEl as HTMLElement;
      const projectId = htmlEl.dataset['projectId'];
      if (!projectId) return;

      console.log('🎪 Setting up draggable for project:', projectId, 'at index:', index);

      // Make element draggable
      const cleanupDrag = draggable({
        element: htmlEl,
        getInitialData: () => ({
          type: 'project',
          projectId,
          index,
          parentFolderId: this.item().id?.startsWith('folder-')
            ? this.item().id?.replace('folder-', '')
            : null,
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          // Create an empty/transparent drag image to disable native preview
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.globalAlpha = 0;
            ctx.fillRect(0, 0, 1, 1);
          }
          if (nativeSetDragImage) {
            nativeSetDragImage(canvas, 0, 0);
          }
        },
        onDragStart: () => {
          htmlEl.classList.add('dragging');
          this._dropHandled = false;
        },
        onDrop: () => {
          htmlEl.classList.remove('dragging');
          this._removeDropIndicator();
        },
      });

      // Make element also a drop target for reordering
      const cleanupDrop = dropTargetForElements({
        element: htmlEl,
        getData: ({ element: el, input: dragInput }) => {
          const data = {
            type: 'reorder-project',
            projectId,
            index,
          };

          // Attach dynamic closest edge information to data
          return attachClosestEdge(data, {
            element: el,
            input: dragInput,
            allowedEdges: ['top', 'bottom'],
          });
        },
        onDragEnter: ({ self, source }) => {
          if (source.data.type !== 'project') return;
          const closestEdge = extractClosestEdge(self.data) as 'top' | 'bottom' | null;
          if (closestEdge) {
            this._showDropIndicator(htmlEl, closestEdge);
          }
        },
        onDrag: ({ self, source }) => {
          if (source.data.type !== 'project') return;
          const closestEdge = extractClosestEdge(self.data) as 'top' | 'bottom' | null;
          if (closestEdge) {
            this._showDropIndicator(htmlEl, closestEdge);
          }
        },
        onDragLeave: () => {
          this._removeDropIndicator();
        },
        onDrop: ({ self, source }) => {
          if (this._dropHandled) {
            return;
          }
          this._dropHandled = true;
          this._removeDropIndicator();
          if (source.data.type !== 'project') return;

          const draggedProjectId = source.data.projectId as string;
          const targetIndex = self.data.index as number;
          const closestEdge = extractClosestEdge(self.data) as 'top' | 'bottom' | null;

          if (!closestEdge || draggedProjectId === projectId) return;

          // Calculate the final index based on edge
          // We need to adjust for the fact that the dragged item might be in the same container
          let adjustedTargetIndex = targetIndex;

          // If dragging within the same folder, we need to account for the dragged item's removal
          const draggedItemSourceIndex = source.data.index as number;
          const draggedItemParentFolderId = source.data.parentFolderId;
          const currentFolderId = this.item().id?.startsWith('folder-')
            ? this.item().id?.replace('folder-', '')
            : null;

          if (
            draggedItemParentFolderId === currentFolderId &&
            draggedItemSourceIndex < targetIndex
          ) {
            adjustedTargetIndex = targetIndex - 1;
          }

          const finalIndex =
            closestEdge === 'bottom' ? adjustedTargetIndex + 1 : adjustedTargetIndex;

          // Get the folder ID (null for top-level projects)
          const folderId = this.item().id?.startsWith('folder-')
            ? this.item().id?.replace('folder-', '')
            : null;

          console.log('🔄 Project reorder drop:', {
            draggedProjectId,
            targetFolderId: folderId,
            targetIndex: finalIndex,
            originalTargetIndex: targetIndex,
            draggedItemSourceIndex,
            draggedItemParentFolderId,
            currentFolderId,
            closestEdge,
          });

          this.projectMove.emit({
            projectId: draggedProjectId,
            targetFolderId: folderId,
            targetIndex: finalIndex,
          });
        },
        canDrop: ({ source }) => source.data.type === 'project',
      });

      this._cleanupFunctions.push(cleanupDrag, cleanupDrop);
    });
  }

  private _setupFolderDragDrop(element: HTMLElement): void {
    // Find only direct child folder elements (not nested ones in sub-folders)
    const navChildren = element.querySelector(':scope > .nav-children');
    if (!navChildren) return;

    // Only get direct children that are folder items
    const directChildren = Array.from(navChildren.children);
    const folderElements = directChildren.filter(
      (child) =>
        child.hasAttribute('data-folder-id') &&
        child.classList.contains('nav-child-item') &&
        child.classList.contains('folder-item'),
    );

    folderElements.forEach((folderEl: Element, index) => {
      const htmlEl = folderEl as HTMLElement;
      const folderId = htmlEl.dataset['folderId'];
      if (!folderId) return;

      // Make folder element draggable
      const cleanupDrag = draggable({
        element: htmlEl,
        getInitialData: () => ({
          type: 'folder',
          folderId,
          index,
          parentFolderId: this.item().id?.startsWith('folder-')
            ? this.item().id?.replace('folder-', '')
            : null,
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          // Create an empty/transparent drag image to disable native preview
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.globalAlpha = 0;
            ctx.fillRect(0, 0, 1, 1);
          }
          if (nativeSetDragImage) {
            nativeSetDragImage(canvas, 0, 0);
          }
        },
        onDragStart: () => {
          htmlEl.classList.add('dragging');
          this._dropHandled = false;
        },
        onDrop: () => {
          htmlEl.classList.remove('dragging');
          this._removeDropIndicator();
        },
      });

      // Make folder element also a drop target for reordering with other folders
      const cleanupDrop = dropTargetForElements({
        element: htmlEl,
        getData: ({ element: el, input: dragInput }) => {
          const data = {
            type: 'reorder-folder',
            folderId,
            index,
          };

          // Attach dynamic closest edge information to data
          return attachClosestEdge(data, {
            element: el,
            input: dragInput,
            allowedEdges: ['top', 'bottom'],
          });
        },
        onDragEnter: ({ self, source }) => {
          if (source.data.type !== 'folder') return;
          const closestEdge = extractClosestEdge(self.data) as 'top' | 'bottom' | null;
          if (closestEdge) {
            this._showDropIndicator(htmlEl, closestEdge);
          }
        },
        onDrag: ({ self, source }) => {
          if (source.data.type !== 'folder') return;
          const closestEdge = extractClosestEdge(self.data) as 'top' | 'bottom' | null;
          if (closestEdge) {
            this._showDropIndicator(htmlEl, closestEdge);
          }
        },
        onDragLeave: () => {
          this._removeDropIndicator();
        },
        onDrop: ({ self, source }) => {
          if (this._dropHandled) {
            return;
          }
          this._dropHandled = true;
          this._removeDropIndicator();
          if (source.data.type !== 'folder') return;

          const draggedFolderId = source.data.folderId as string;
          const targetIndex = self.data.index as number;
          const closestEdge = extractClosestEdge(self.data) as 'top' | 'bottom' | null;

          if (!closestEdge || draggedFolderId === folderId) return;

          // Calculate the final index based on edge
          const finalIndex = closestEdge === 'bottom' ? targetIndex + 1 : targetIndex;

          // Get the parent folder ID (null for top-level folders)
          const parentFolderId = this.item().id?.startsWith('folder-')
            ? this.item().id?.replace('folder-', '')
            : null;

          this.folderMove.emit({
            folderId: draggedFolderId,
            targetParentFolderId: parentFolderId,
            targetIndex: finalIndex,
          });
        },
        canDrop: ({ source }) => source.data.type === 'folder',
      });

      this._cleanupFunctions.push(cleanupDrag, cleanupDrop);
    });
  }

  private _setupFolderDropZones(element: HTMLElement): void {
    // Set up main projects drop zone (only for direct header, not nested)
    const projectsHeader = element.querySelector(
      ':scope > .g-multi-btn-wrapper[data-drop-zone="projects"]',
    );
    if (projectsHeader) {
      const cleanup = dropTargetForElements({
        element: projectsHeader as HTMLElement,
        getData: () => ({ type: 'folder', folderId: null }),
        onDragEnter: () => {
          projectsHeader.classList.add('drop-target-active');
        },
        onDragLeave: () => {
          projectsHeader.classList.remove('drop-target-active');
        },
        onDrop: ({ source }) => {
          if (this._dropHandled) {
            return;
          }
          this._dropHandled = true;
          projectsHeader.classList.remove('drop-target-active');
          if (source.data.type === 'project') {
            // Calculate target index to append at the end of root-level projects
            const navChildren = element.querySelector(':scope > .nav-children');
            let targetIndex = 0;

            if (navChildren) {
              // Count existing root-level projects to determine append index
              const rootProjectElements = Array.from(navChildren.children).filter(
                (child) => child.hasAttribute('data-project-id'),
              );
              targetIndex = rootProjectElements.length;
            }

            this.projectMove.emit({
              projectId: source.data.projectId as string,
              targetFolderId: null,
              targetIndex,
            });
          } else if (source.data.type === 'folder') {
            // Calculate target index for root-level folders
            const navChildren = element.querySelector(':scope > .nav-children');
            let targetIndex = 0;

            if (navChildren) {
              const rootFolderElements = Array.from(navChildren.children).filter(
                (child) => child.hasAttribute('data-folder-id'),
              );
              targetIndex = rootFolderElements.length;
            }

            this.folderMove.emit({
              folderId: source.data.folderId as string,
              targetParentFolderId: null,
              targetIndex,
            });
          }
        },
        canDrop: ({ source }) =>
          source.data.type === 'project' || source.data.type === 'folder',
      });
      this._cleanupFunctions.push(cleanup);
    }

    // Set up folder drop zones (only direct children, not nested)
    const navChildren = element.querySelector(':scope > .nav-children');
    if (navChildren) {
      const directChildren = Array.from(navChildren.children);
      const folderElements = directChildren.filter(
        (child) =>
          child.hasAttribute('data-folder-id') &&
          child.classList.contains('nav-child-item'),
      );

      folderElements.forEach((folderEl: Element) => {
        const htmlEl = folderEl as HTMLElement;
        const folderId = htmlEl.dataset['folderId'];
        if (!folderId) return;

        // Target the folder header specifically, not the entire folder container
        const folderHeader = htmlEl.querySelector('.g-multi-btn-wrapper');
        if (!folderHeader) return;

        const cleanup = dropTargetForElements({
          element: folderHeader as HTMLElement,
          getData: () => ({ type: 'folder-drop', folderId }),
          onDragEnter: () => {
            folderHeader.classList.add('drop-target-active');
          },
          onDragLeave: () => {
            folderHeader.classList.remove('drop-target-active');
          },
          onDrop: ({ source }) => {
            if (this._dropHandled) {
              return;
            }
            this._dropHandled = true;
            folderHeader.classList.remove('drop-target-active');
            if (source.data.type === 'project') {
              // Calculate the target index to append at the end of the folder
              const folderContainer = htmlEl.querySelector('.nav-children');
              let targetIndex = 0;

              if (folderContainer) {
                // Count existing projects in this folder to determine append index
                const projectElements = Array.from(folderContainer.children).filter(
                  (child) => child.hasAttribute('data-project-id'),
                );
                targetIndex = projectElements.length;
              }

              console.log('📁 Folder drop:', {
                projectId: source.data.projectId,
                targetFolderId: folderId,
                targetIndex,
                sourceType: source.data.type,
              });

              this.projectMove.emit({
                projectId: source.data.projectId as string,
                targetFolderId: folderId,
                targetIndex,
              });
            } else if (source.data.type === 'folder') {
              // Prevent nesting deeper than one level - check if this folder is a child
              const isChildFolder = this.item().id?.startsWith('folder-');
              if (!isChildFolder) {
                // Calculate target index for folder
                const parentContainer = htmlEl.closest('.nav-children');
                let targetIndex = 0;

                if (parentContainer) {
                  const parentFolderElements = Array.from(
                    parentContainer.children,
                  ).filter((child) => child.hasAttribute('data-folder-id'));
                  targetIndex = parentFolderElements.length;
                }

                this.folderMove.emit({
                  folderId: source.data.folderId as string,
                  targetParentFolderId: folderId,
                  targetIndex,
                });
              }
            }
          },
          canDrop: ({ source }) => {
            if (source.data.type === 'project') return true;
            if (source.data.type === 'folder') {
              // Don't allow folder to be dropped into itself or allow nesting deeper than 1 level
              const draggedFolderId = source.data.folderId as string;
              const isChildFolder = this.item().id?.startsWith('folder-');
              return draggedFolderId !== folderId && !isChildFolder;
            }
            return false;
          },
        });

        this._cleanupFunctions.push(cleanup);
      });
    }
  }

  private _showDropIndicator(element: HTMLElement, edge: 'top' | 'bottom'): void {
    // Remove any existing indicators first
    this._removeDropIndicator();

    // Create a proper drop indicator element
    this._dropIndicatorEl = document.createElement('div');
    this._dropIndicatorEl.className = 'pragmatic-drop-indicator';

    // Style the indicator
    Object.assign(this._dropIndicatorEl.style, {
      position: 'absolute',
      left: '8px',
      right: '8px',
      height: '2px',
      backgroundColor: 'var(--c-primary)',
      borderRadius: '1px',
      boxShadow: '0 0 0 1px var(--background-color), 0 0 8px var(--c-primary)',
      zIndex: '10000',
      pointerEvents: 'none',
      opacity: '1',
    });

    // Add a circle at the start like Atlassian's examples
    const circle = document.createElement('div');
    Object.assign(circle.style, {
      position: 'absolute',
      left: '-4px',
      top: '-3px',
      width: '8px',
      height: '8px',
      backgroundColor: 'var(--c-primary)',
      border: '2px solid var(--background-color)',
      borderRadius: '50%',
      boxShadow: '0 0 0 1px var(--c-primary)',
    });
    this._dropIndicatorEl.appendChild(circle);

    // Position the indicator relative to the target element
    const rect = element.getBoundingClientRect();
    const containerRect = element.offsetParent?.getBoundingClientRect();

    if (containerRect) {
      const top =
        edge === 'top'
          ? rect.top - containerRect.top - 1
          : rect.bottom - containerRect.top - 1;

      this._dropIndicatorEl.style.top = `${top}px`;
    }

    // Insert the indicator into the container
    const container = element.closest('.nav-children') || element.parentElement;
    if (container) {
      container.appendChild(this._dropIndicatorEl);
    }

    this._indicatorTargetEl = element;
    this._indicatorEdge = edge;
  }

  private _showDropIndicatorForEmptyContainer(
    container: HTMLElement,
    edge: 'top' | 'bottom' = 'top',
  ): void {
    this._removeDropIndicator();

    // Create a proper drop indicator element
    this._dropIndicatorEl = document.createElement('div');
    this._dropIndicatorEl.className = 'pragmatic-drop-indicator';

    // Style the indicator
    Object.assign(this._dropIndicatorEl.style, {
      position: 'absolute',
      left: '8px',
      right: '8px',
      height: '2px',
      backgroundColor: 'var(--c-primary)',
      borderRadius: '1px',
      boxShadow: '0 0 0 1px var(--background-color), 0 0 8px var(--c-primary)',
      zIndex: '10000',
      pointerEvents: 'none',
      opacity: '1',
      top: edge === 'top' ? '4px' : 'calc(100% - 6px)',
    });

    // Add a circle at the start like Atlassian's examples
    const circle = document.createElement('div');
    Object.assign(circle.style, {
      position: 'absolute',
      left: '-4px',
      top: '-3px',
      width: '8px',
      height: '8px',
      backgroundColor: 'var(--c-primary)',
      border: '2px solid var(--background-color)',
      borderRadius: '50%',
      boxShadow: '0 0 0 1px var(--c-primary)',
    });
    this._dropIndicatorEl.appendChild(circle);

    container.appendChild(this._dropIndicatorEl);
  }

  private _setupEmptyAreaDropZone(element: HTMLElement): void {
    const navChildren = element.querySelector(':scope > .nav-children');
    if (!navChildren) return;

    const cleanup = dropTargetForElements({
      element: navChildren as HTMLElement,
      getData: () => ({ type: 'empty-area' }),
      onDragEnter: ({ source }) => {
        if (source.data.type !== 'project' && source.data.type !== 'folder') return;

        // Show drop indicator at the end of the list
        const lastChild = navChildren.lastElementChild as HTMLElement;
        if (
          lastChild &&
          (lastChild.hasAttribute('data-project-id') ||
            lastChild.hasAttribute('data-folder-id'))
        ) {
          this._showDropIndicator(lastChild, 'bottom');
        } else {
          // Empty list → show at container edge
          this._showDropIndicatorForEmptyContainer(navChildren as HTMLElement, 'top');
        }
      },
      onDragLeave: () => {
        this._removeDropIndicator();
      },
      onDrop: ({ source }) => {
        if (this._dropHandled) {
          return;
        }
        this._dropHandled = true;
        this._removeDropIndicator();
        if (source.data.type !== 'project' && source.data.type !== 'folder') return;

        // Get the folder ID (null for top-level items)
        const folderId = this.item().id?.startsWith('folder-')
          ? this.item().id?.replace('folder-', '')
          : null;

        if (source.data.type === 'project') {
          // Calculate the index as the last position for projects
          const projectElements = Array.from(navChildren.children).filter((child) =>
            child.hasAttribute('data-project-id'),
          );
          const targetIndex = projectElements.length;

          this.projectMove.emit({
            projectId: source.data.projectId as string,
            targetFolderId: folderId,
            targetIndex,
          });
        } else if (source.data.type === 'folder') {
          // Only allow folder drop if we're not in a child folder (prevent deep nesting)
          const isChildFolder = this.item().id?.startsWith('folder-');
          if (!isChildFolder) {
            // Calculate the index as the last position for folders
            const folderElements = Array.from(navChildren.children).filter((child) =>
              child.hasAttribute('data-folder-id'),
            );
            const targetIndex = folderElements.length;

            this.folderMove.emit({
              folderId: source.data.folderId as string,
              targetParentFolderId: folderId,
              targetIndex,
            });
          }
        }
      },
      canDrop: ({ source }) => {
        if (source.data.type === 'project') return true;
        if (source.data.type === 'folder') {
          // Don't allow folders to be dropped into child folders (prevent deep nesting)
          const isChildFolder = this.item().id?.startsWith('folder-');
          return !isChildFolder;
        }
        return false;
      },
    });

    this._cleanupFunctions.push(cleanup);
  }

  private _removeDropIndicator(): void {
    if (this._dropIndicatorEl) {
      this._dropIndicatorEl.remove();
      this._dropIndicatorEl = null;
    }
    // Clear the target element reference
    this._indicatorTargetEl = null;
    this._indicatorEdge = null;
  }
}
