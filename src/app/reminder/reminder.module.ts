import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReminderService } from './reminder.service';
import { ProjectModule } from '../project/project.module';
import { CoreModule } from '../core/core.module';
import { TasksModule } from '../tasks/tasks.module';
import { NoteModule } from '../note/note.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    CoreModule,
    ProjectModule,
    TasksModule,
    NoteModule,
  ],
  providers: [
    ReminderService,
  ]
})
export class ReminderModule {
  constructor(private _reminderService: ReminderService) {
    _reminderService.init();
  }
}
