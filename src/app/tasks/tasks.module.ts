import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskComponent } from './task/task.component';
import { TaskListComponent } from './task-list/task-list.component';
import { UiModule } from '../ui/ui.module';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { DragulaModule } from 'ng2-dragula';
import { AddTaskBarComponent } from './add-task-bar/add-task-bar.component';
import { DialogTimeEstimateComponent } from './dialogs/dialog-time-estimate/dialog-time-estimate.component';
import { ToArrayPipe } from '../helper/to-array.pipe';
import { KeysPipe } from '../helper/keys.pipe';
import { StoreModule } from '@ngrx/store';
import { TaskEffects } from './store/task.effects';
import { EffectsModule } from '@ngrx/effects';
import { TaskService } from './task.service';
import { TASK_FEATURE_NAME } from './task.const';
import { taskSharedStateReducer } from './store/task-shared.reducer';
import { taskReducer } from './store/task.reducer';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    FormsModule,
    ReactiveFormsModule,
    DragulaModule,
    StoreModule.forFeature(TASK_FEATURE_NAME, {
      taskSharedState: taskSharedStateReducer,
      tasks: taskReducer
    }),
    EffectsModule.forFeature([TaskEffects]),
  ],
  declarations: [
    TaskComponent,
    TaskListComponent,
    AddTaskBarComponent,
    DialogTimeEstimateComponent,
    KeysPipe,
    ToArrayPipe,
  ],
  exports: [
    TaskComponent,
    TaskListComponent,
    AddTaskBarComponent,
    DialogTimeEstimateComponent,
  ],
  providers: [
    TaskService
  ],

})
export class TasksModule {
}
