import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RightPanelComponent } from './right-panel.component';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../tasks/tasks.module';
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';
import { NoteModule } from '../note/note.module';
import { IssuePanelComponent } from '../issue-panel/issue-panel.component';

@NgModule({
  declarations: [RightPanelComponent],
  imports: [
    CommonModule,
    UiModule,
    TasksModule,
    BetterDrawerModule,
    NoteModule,
    IssuePanelComponent,
  ],
  exports: [RightPanelComponent],
})
export class RightPanelModule {}
