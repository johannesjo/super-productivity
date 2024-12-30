import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskComponent } from './task/task.component';
import { TaskListComponent } from './task-list/task-list.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MentionModule } from 'angular-mentions';
import { AddTaskBarComponent } from './add-task-bar/add-task-bar.component';
import { DialogTimeEstimateComponent } from './dialog-time-estimate/dialog-time-estimate.component';
import { TaskDetailPanelComponent } from './task-detail-panel/task-detail-panel.component';
import { SelectTaskComponent } from './select-task/select-task.component';
import { TaskAttachmentModule } from './task-attachment/task-attachment.module';
import { IssueModule } from '../issue/issue.module';
import { FilterDoneTasksPipe } from './filter-done-tasks.pipe';
import { TaskSummaryTableComponent } from './task-summary-table/task-summary-table.component';
import { DialogAddTimeEstimateForOtherDayComponent } from './dialog-add-time-estimate-for-other-day/dialog-add-time-estimate-for-other-day.component';
import { TaskRepeatCfgModule } from '../task-repeat-cfg/task-repeat-cfg.module';
import { SubTaskTotalTimeSpentPipe } from './pipes/sub-task-total-time-spent.pipe';
import { TaskDetailItemComponent } from './task-detail-panel/task-additional-info-item/task-detail-item.component';
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';
import { TagModule } from '../tag/tag.module';
import { TagService } from '../tag/tag.service';
import { DialogViewTaskRemindersComponent } from './dialog-view-task-reminders/dialog-view-task-reminders.component';
import { TaskSummaryTablesComponent } from './task-summary-tables/task-summary-tables.component';
import { TasksByTagComponent } from './tasks-by-tag/tasks-by-tag.component';
import { InlineMultilineInputComponent } from '../../ui/inline-multiline-input/inline-multiline-input.component';
import { TaskContextMenuComponent } from './task-context-menu/task-context-menu.component';
import { TaskHoverControlsComponent } from './task/task-hover-controls/task-hover-controls.component';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { TagEditComponent } from '../tag/tag-edit/tag-edit.component';

@NgModule({
  imports: [
    CommonModule,
    IssueModule,
    MentionModule,
    UiModule,
    FormsModule,
    TaskAttachmentModule,
    ReactiveFormsModule,
    TaskRepeatCfgModule,
    TagModule,

    BetterDrawerModule,
    InlineMultilineInputComponent,
    TaskContextMenuComponent,
    TaskHoverControlsComponent,
    CdkDropList,
    CdkDrag,
    TagEditComponent,
  ],
  declarations: [
    TaskComponent,
    TaskListComponent,
    AddTaskBarComponent,
    DialogTimeEstimateComponent,
    DialogViewTaskRemindersComponent,
    DialogAddTimeEstimateForOtherDayComponent,
    TaskDetailPanelComponent,
    SelectTaskComponent,
    FilterDoneTasksPipe,
    TaskSummaryTableComponent,
    SubTaskTotalTimeSpentPipe,
    TaskDetailItemComponent,
    TaskSummaryTablesComponent,
    TasksByTagComponent,
  ],
  exports: [
    TaskComponent,
    TaskListComponent,
    AddTaskBarComponent,
    SelectTaskComponent,
    TaskSummaryTableComponent,
    TaskSummaryTablesComponent,
    TaskDetailPanelComponent,
    TasksByTagComponent,
  ],
  providers: [TagService],
})
export class TasksModule {}
