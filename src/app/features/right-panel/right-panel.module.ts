import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RightPanelComponent } from './right-panel.component';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../tasks/tasks.module';
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';
import { NoteModule } from '../note/note.module';
import { InboxComponent } from '../add-task-panel/inbox.component';

@NgModule({
  declarations: [RightPanelComponent],
  imports: [
    CommonModule,
    UiModule,
    TasksModule,
    BetterDrawerModule,
    NoteModule,
    InboxComponent,
  ],
  exports: [RightPanelComponent],
})
export class RightPanelModule {}
