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
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
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
import { BottomPanelPositionService } from '../../core-ui/layout/bottom-panel-position.service';

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
  private _positionService = inject(BottomPanelPositionService);
  readonly data = inject<BottomPanelData>(MAT_BOTTOM_SHEET_DATA);

  readonly dragHandle = viewChild<ElementRef>('dragHandle');

  readonly panelContent = computed(() => this.data.panelContent);
  readonly selectedTask = computed(() => this.data.selectedTask || null);
  readonly activePluginId = computed(() => this.data.activePluginId || null);
  readonly isDisableTaskPanelAni = signal(this.data.isDisableTaskPanelAni ?? false);

  readonly pluginPanelKeys = computed<string[]>(() => {
    const activePluginId = this.activePluginId();
    return activePluginId ? [`plugin-${activePluginId}`] : [];
  });

  private _isDragging = false;
  private _startY = 0;
  private _startHeight = 0;

  ngAfterViewInit(): void {
    this._setupDragListeners();
    this._setInitialHeight();
  }

  ngOnDestroy(): void {
    this._removeDragListeners();
  }

  close(): void {
    this._bottomSheetRef.dismiss();
  }

  private _setupDragListeners(): void {
    const dragHandle = this.dragHandle()?.nativeElement;
    if (!dragHandle) return;

    // Mouse events
    dragHandle.addEventListener('mousedown', this._onDragStart.bind(this));
    document.addEventListener('mousemove', this._onDragMove.bind(this));
    document.addEventListener('mouseup', this._onDragEnd.bind(this));

    // Touch events
    dragHandle.addEventListener('touchstart', this._onTouchStart.bind(this), {
      passive: false,
    });
    document.addEventListener('touchmove', this._onTouchMove.bind(this), {
      passive: false,
    });
    document.addEventListener('touchend', this._onTouchEnd.bind(this));
  }

  private _removeDragListeners(): void {
    const dragHandle = this.dragHandle()?.nativeElement;
    if (dragHandle) {
      dragHandle.removeEventListener('mousedown', this._onDragStart.bind(this));
      dragHandle.removeEventListener('touchstart', this._onTouchStart.bind(this));
    }
    document.removeEventListener('mousemove', this._onDragMove.bind(this));
    document.removeEventListener('mouseup', this._onDragEnd.bind(this));
    document.removeEventListener('touchmove', this._onTouchMove.bind(this));
    document.removeEventListener('touchend', this._onTouchEnd.bind(this));
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

    // Constrain height between 20vh and 98vh
    const minHeight = viewportHeight * 0.2;
    const maxHeight = viewportHeight * 0.98;
    const constrainedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);

    container.style.height = `${constrainedHeight}px`;
    container.style.maxHeight = `${constrainedHeight}px`;
  }

  private _onDragEnd(): void {
    this._isDragging = false;
    document.body.style.userSelect = '';
    const container = this._getSheetContainer();
    if (container) {
      container.classList.remove('dragging');
      // Save the current height for this panel type
      this._positionService.saveHeight(this.panelContent(), container.offsetHeight);
    }
  }

  private _onTouchEnd(): void {
    this._isDragging = false;
    document.body.style.userSelect = '';
    const container = this._getSheetContainer();
    if (container) {
      container.classList.remove('dragging');
      // Save the current height for this panel type
      this._positionService.saveHeight(this.panelContent(), container.offsetHeight);
    }
  }

  private _setInitialHeight(): void {
    const container = this._getSheetContainer();
    if (container) {
      const savedHeight = this._positionService.getSavedHeight(this.panelContent());
      container.style.height = `${savedHeight}px`;
      container.style.maxHeight = `${savedHeight}px`;
    }
  }

  private _getSheetContainer(): HTMLElement | null {
    return this._elementRef.nativeElement.closest('.mat-bottom-sheet-container');
  }
}
