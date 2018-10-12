import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkViewPageComponent } from './work-view-page.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../../tasks/tasks.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    TasksModule,
  ],
  declarations: [WorkViewPageComponent],
  exports: [WorkViewPageComponent],
})
export class WorkViewPageModule {
}
