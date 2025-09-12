import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { TaskWithSubTasks } from '../tasks/task.model';
import { TaskDetailPanelComponent } from '../tasks/task-detail-panel/task-detail-panel.component';
import { NotesComponent } from '../note/notes/notes.component';
import { IssuePanelComponent } from '../issue-panel/issue-panel.component';
import { TaskViewCustomizerPanelComponent } from '../task-view-customizer/task-view-customizer-panel/task-view-customizer-panel.component';
import { PluginPanelContainerComponent } from '../../plugins/ui/plugin-panel-container/plugin-panel-container.component';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { taskDetailPanelTaskChangeAnimation } from '../tasks/task-detail-panel/task-detail-panel.ani';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TaskService } from '../tasks/task.service';

export interface BottomPanelData {
  panelContent:
    | 'NOTES'
    | 'TASK'
    | 'ADD_TASK_PANEL'
    | 'ISSUE_PANEL'
    | 'TASK_VIEW_CUSTOMIZER_PANEL'
    | 'PLUGIN';
  selectedTask?: TaskWithSubTasks | null;
  activePluginId?: string | null;
  isDisableTaskPanelAni?: boolean;
}

// Panel height constants
const PANEL_HEIGHTS = {
  MAX_HEIGHT: 0.8,
  MIN_HEIGHT: 0.2,
  MAX_HEIGHT_ABSOLUTE: 0.98,
  TASK_PANEL_HEIGHT: 0.5,
  OTHER_PANEL_HEIGHT: 0.8,
  VELOCITY_THRESHOLD: 0.5,
  INITIAL_ANIMATION_BLOCK_DURATION: 300, // ms
} as const;

@Component({
  selector: 'bottom-panel-container',
  templateUrl: './bottom-panel-container.component.html',
  styleUrls: ['./bottom-panel-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation, taskDetailPanelTaskChangeAnimation],
  imports: [
    MatIconModule,
    MatButtonModule,
    TaskDetailPanelComponent,
    NotesComponent,
    IssuePanelComponent,
    TaskViewCustomizerPanelComponent,
    PluginPanelContainerComponent,
  ],
  standalone: true,
})
export class BottomPanelContainerComponent implements AfterViewInit, OnDestroy {
  private _bottomSheetRef = inject(MatBottomSheetRef<BottomPanelContainerComponent>);
  private _elementRef = inject(ElementRef);
  private _taskService = inject(TaskService);
  readonly data = inject<BottomPanelData>(MAT_BOTTOM_SHEET_DATA);

  readonly panelHeader = viewChild<ElementRef>('panelHeader');

  readonly panelContent = computed(() => this.data.panelContent);
  readonly selectedTask = toSignal(this._taskService.selectedTask$, {
    initialValue: null,
  });
  readonly activePluginId = computed(() => this.data.activePluginId || null);
  readonly isDisableTaskPanelAni = signal(true); // Always start with animation disabled

  readonly pluginPanelKeys = computed<string[]>(() => {
    const activePluginId = this.activePluginId();
    return activePluginId ? [`plugin-${activePluginId}`] : [];
  });

  private _isDragging = false;
  private _startY = 0;
  private _startHeight = 0;
  private _lastY = 0;
  private _lastTime = 0;
  private _velocity = 0;
  private _disableAniTimeout?: number;
  private _cachedContainer: HTMLElement | null = null;

  // Store bound functions to prevent memory leaks
  private readonly _boundOnDragStart = this._onDragStart.bind(this);
  private readonly _boundOnDragMove = this._onDragMove.bind(this);
  private readonly _boundOnDragEnd = this._onDragEnd.bind(this);
  private readonly _boundOnTouchStart = this._onTouchStart.bind(this);
  private readonly _boundOnTouchMove = this._onTouchMove.bind(this);
  private readonly _boundOnTouchEnd = this._onTouchEnd.bind(this);

  ngAfterViewInit(): void {
    this._setupDragListeners();
    this._setInitialHeight();

    // Re-enable animations after initial render is complete
    this._disableAniTimeout = window.setTimeout(() => {
      this.isDisableTaskPanelAni.set(false);
    }, PANEL_HEIGHTS.INITIAL_ANIMATION_BLOCK_DURATION);
  }

  ngOnDestroy(): void {
    this._removeDragListeners();
    window.clearTimeout(this._disableAniTimeout);
    this._cachedContainer = null; // Clear cached reference
  }

  close(): void {
    this._bottomSheetRef.dismiss();
  }

  private _setupDragListeners(): void {
    const panelHeader = this.panelHeader()?.nativeElement;
    if (!panelHeader) return;

    // Mouse events
    panelHeader.addEventListener('mousedown', this._boundOnDragStart);
    document.addEventListener('mousemove', this._boundOnDragMove);
    document.addEventListener('mouseup', this._boundOnDragEnd);

    // Touch events
    panelHeader.addEventListener('touchstart', this._boundOnTouchStart, {
      passive: false,
    });
    document.addEventListener('touchmove', this._boundOnTouchMove, {
      passive: false,
    });
    document.addEventListener('touchend', this._boundOnTouchEnd);
  }

  private _removeDragListeners(): void {
    const panelHeader = this.panelHeader()?.nativeElement;
    if (panelHeader) {
      panelHeader.removeEventListener('mousedown', this._boundOnDragStart);
      panelHeader.removeEventListener('touchstart', this._boundOnTouchStart);
    }
    document.removeEventListener('mousemove', this._boundOnDragMove);
    document.removeEventListener('mouseup', this._boundOnDragEnd);
    document.removeEventListener('touchmove', this._boundOnTouchMove);
    document.removeEventListener('touchend', this._boundOnTouchEnd);
  }

  private _onDragStart(event: MouseEvent): void {
    this._startDrag(event.clientY);
  }

  private _onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this._startDrag(event.touches[0].clientY);
  }

  private _startDrag(clientY: number): void {
    this._isDragging = true;
    this._startY = clientY;
    this._lastY = clientY;
    this._lastTime = Date.now();
    this._velocity = 0;
    const container = this._getSheetContainer();
    if (container) {
      this._startHeight = container.offsetHeight;
      container.classList.add('dragging');
    }
    document.body.style.userSelect = 'none';
  }

  private _onDragMove(event: MouseEvent): void {
    if (!this._isDragging) return;
    event.preventDefault();
    this._updateHeight(event.clientY);
  }

  private _onTouchMove(event: TouchEvent): void {
    if (!this._isDragging) return;
    event.preventDefault();
    this._updateHeight(event.touches[0].clientY);
  }

  private _updateHeight(clientY: number): void {
    const container = this._getSheetContainer();
    if (!container) return;

    const deltaY = this._startY - clientY;
    const newHeight = this._startHeight + deltaY;
    const viewportHeight = window.innerHeight;

    // Constrain height between min and max bounds
    const minHeight = viewportHeight * PANEL_HEIGHTS.MIN_HEIGHT;
    const maxHeight = viewportHeight * PANEL_HEIGHTS.MAX_HEIGHT_ABSOLUTE;
    const constrainedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);

    container.style.height = `${constrainedHeight}px`;
    container.style.maxHeight = `${constrainedHeight}px`;

    // Calculate velocity for momentum detection
    const currentTime = Date.now();
    const timeDiff = currentTime - this._lastTime;
    if (timeDiff > 0) {
      this._velocity = (clientY - this._lastY) / timeDiff;
    }
    this._lastY = clientY;
    this._lastTime = currentTime;
  }

  private _onDragEnd(): void {
    this._handleDragEnd();
  }

  private _onTouchEnd(): void {
    this._handleDragEnd();
  }

  private _handleDragEnd(): void {
    this._isDragging = false;
    document.body.style.userSelect = '';
    const container = this._getSheetContainer();
    if (container) {
      container.classList.remove('dragging');

      // Check for momentum and handle snap behavior
      const viewportHeight = window.innerHeight;

      if (Math.abs(this._velocity) > PANEL_HEIGHTS.VELOCITY_THRESHOLD) {
        if (this._velocity > 0) {
          // Swiping down with momentum - close the panel
          this.close();
          return;
        } else {
          // Swiping up with momentum - expand to max height
          const targetHeight = viewportHeight * PANEL_HEIGHTS.MAX_HEIGHT;
          container.style.height = `${targetHeight}px`;
          container.style.maxHeight = `${targetHeight}px`;
          container.style.transition = 'height 0.3s ease-out, max-height 0.3s ease-out';

          // Remove transition after animation
          setTimeout(() => {
            container.style.transition = '';
          }, PANEL_HEIGHTS.INITIAL_ANIMATION_BLOCK_DURATION);
          return;
        }
      }

      // No momentum - no action needed
    }
  }

  private _setInitialHeight(): void {
    const container = this._getSheetContainer();
    if (container) {
      const heightRatio =
        this.panelContent() === 'TASK'
          ? PANEL_HEIGHTS.TASK_PANEL_HEIGHT
          : PANEL_HEIGHTS.OTHER_PANEL_HEIGHT;
      const initialHeight = window.innerHeight * heightRatio;
      container.style.height = `${initialHeight}px`;
      container.style.maxHeight = `${initialHeight}px`;
    }
  }

  private _getSheetContainer(): HTMLElement | null {
    if (!this._cachedContainer) {
      try {
        this._cachedContainer = this._elementRef.nativeElement.closest(
          '.mat-bottom-sheet-container',
        );
      } catch (error) {
        console.warn('Failed to find bottom sheet container:', error);
        return null;
      }
    }
    return this._cachedContainer;
  }
}
