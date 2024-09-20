import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainHeaderComponent } from './main-header.component';
import { UiModule } from '../../ui/ui.module';
import { ProjectModule } from '../../features/project/project.module';
import { RouterModule } from '@angular/router';
import { BookmarkModule } from '../../features/bookmark/bookmark.module';
import { PomodoroModule } from '../../features/pomodoro/pomodoro.module';
import { TagModule } from '../../features/tag/tag.module';
import { SimpleCounterModule } from '../../features/simple-counter/simple-counter.module';
import { WorkContextMenuComponent } from '../work-context-menu/work-context-menu.component';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    ProjectModule,
    RouterModule,
    BookmarkModule,
    PomodoroModule,
    TagModule,
    SimpleCounterModule,
    WorkContextMenuComponent,
  ],
  declarations: [MainHeaderComponent],
  exports: [MainHeaderComponent],
})
export class MainHeaderModule {}
