import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkViewPageComponent } from './work-view-page.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../ui/ui.module';
import { TasksModule } from '../../tasks/tasks.module';
import { RouterModule } from '@angular/router';
import { SplitModule } from './split/split.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TasksModule,
    SplitModule,
  ],
  declarations: [WorkViewPageComponent],
  exports: [WorkViewPageComponent],
})
export class WorkViewPageModule {
}
