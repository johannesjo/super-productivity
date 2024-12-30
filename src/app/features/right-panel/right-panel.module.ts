import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RightPanelComponent } from './right-panel.component';
import { UiModule } from '../../ui/ui.module';
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';
import { NoteModule } from '../note/note.module';
import { IssuePanelComponent } from '../issue-panel/issue-panel.component';
import { TaskDetailPanelComponent } from '../tasks/task-detail-panel/task-detail-panel.component';

@NgModule({
  declarations: [RightPanelComponent],
  imports: [
    CommonModule,
    UiModule,
    BetterDrawerModule,
    NoteModule,
    IssuePanelComponent,
    TaskDetailPanelComponent,
  ],
  exports: [RightPanelComponent],
})
export class RightPanelModule {}
