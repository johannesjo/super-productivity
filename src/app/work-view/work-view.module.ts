import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkViewComponent } from './work-view.component';
import { ReactiveFormsModule } from '@angular/forms';
import { UiModule } from '../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { TasksModule } from '../tasks/tasks.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    TasksModule,
  ],
  declarations: [WorkViewComponent],
  exports: [WorkViewComponent],
})
export class WorkViewModule {
}
