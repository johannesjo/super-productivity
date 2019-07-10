import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TaskComponent} from './task/task.component';
import {TaskListComponent} from './task-list/task-list.component';
import {UiModule} from '../../ui/ui.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AddTaskBarComponent} from './add-task-bar/add-task-bar.component';
import {DialogTimeEstimateComponent} from './dialog-time-estimate/dialog-time-estimate.component';
import {StoreModule} from '@ngrx/store';
import {TaskEffects} from './store/task.effects';
import {EffectsModule} from '@ngrx/effects';
import {TASK_FEATURE_NAME, taskReducer} from './store/task.reducer';
import {TaskAdditionalInfoComponent} from './task-additional-info/task-additional-info.component';
import {SelectTaskComponent} from './select-task/select-task.component';
import {AttachmentModule} from '../attachment/attachment.module';
import {IssueModule} from '../issue/issue.module';
import {FilterDoneTasksPipe} from './filter-done-tasks.pipe';
import {DialogViewTaskReminderComponent} from './dialog-view-task-reminder/dialog-view-task-reminder.component';
import {DialogAddTaskReminderComponent} from './dialog-add-task-reminder/dialog-add-task-reminder.component';
import {TaskSummaryTableComponent} from './task-summary-table/task-summary-table.component';
import {DialogAddTimeEstimateForOtherDayComponent} from './dialog-add-time-estimate-for-other-day/dialog-add-time-estimate-for-other-day.component';

@NgModule({
  imports: [
    CommonModule,
    IssueModule,
    UiModule,
    FormsModule,
    AttachmentModule,
    ReactiveFormsModule,
    StoreModule.forFeature(TASK_FEATURE_NAME, taskReducer),
    EffectsModule.forFeature([TaskEffects]),
  ],
  declarations: [
    TaskComponent,
    TaskListComponent,
    AddTaskBarComponent,
    DialogTimeEstimateComponent,
    DialogViewTaskReminderComponent,
    DialogAddTaskReminderComponent,
    DialogAddTimeEstimateForOtherDayComponent,
    TaskAdditionalInfoComponent,
    SelectTaskComponent,
    FilterDoneTasksPipe,
    TaskSummaryTableComponent,
  ],
  exports: [
    TaskComponent,
    TaskListComponent,
    AddTaskBarComponent,
    SelectTaskComponent,
    TaskSummaryTableComponent,
  ],
  entryComponents: [
    DialogTimeEstimateComponent,
    DialogViewTaskReminderComponent,
    DialogAddTaskReminderComponent,
    DialogAddTimeEstimateForOtherDayComponent,
  ]

})
export class TasksModule {
}
