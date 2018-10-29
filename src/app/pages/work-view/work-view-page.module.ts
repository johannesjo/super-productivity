import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkViewPageComponent } from './work-view-page.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../../tasks/tasks.module';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TasksModule,
  ],
  declarations: [WorkViewPageComponent],
  exports: [WorkViewPageComponent],
})
export class WorkViewPageModule {
}
