import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
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
export class BottomPanelContainerComponent {
  private _bottomSheetRef = inject(MatBottomSheetRef<BottomPanelContainerComponent>);
  readonly data = inject<BottomPanelData>(MAT_BOTTOM_SHEET_DATA);

  readonly panelContent = computed(() => this.data.panelContent);
  readonly selectedTask = computed(() => this.data.selectedTask || null);
  readonly activePluginId = computed(() => this.data.activePluginId || null);
  readonly isDisableTaskPanelAni = signal(this.data.isDisableTaskPanelAni ?? false);

  readonly pluginPanelKeys = computed<string[]>(() => {
    const activePluginId = this.activePluginId();
    return activePluginId ? [`plugin-${activePluginId}`] : [];
  });

  close(): void {
    this._bottomSheetRef.dismiss();
  }
}
