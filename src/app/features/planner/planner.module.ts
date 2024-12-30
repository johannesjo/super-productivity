import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerComponent } from './planner.component';
import { PlannerPlanViewComponent } from './planner-plan-view/planner-plan-view.component';
import { UiModule } from '../../ui/ui.module';
import {
  CdkDrag,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';
import { NoteModule } from '../note/note.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkViewModule } from '../work-view/work-view.module';
import { AddTaskPanelPlannerComponent } from './add-task-panel-planner/add-task-panel-planner.component';
import { TagModule } from '../tag/tag.module';
import { PlannerTaskComponent } from './planner-task/planner-task.component';
import { PlannerRepeatProjectionComponent } from './planner-repeat-projection/planner-repeat-projection.component';
import { PlannerCalendarEventComponent } from './planner-calendar-event/planner-calendar-event.component';
import { IssueModule } from '../issue/issue.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogAddPlannedTasksComponent } from './dialog-add-planned-tasks/dialog-add-planned-tasks.component';
import { AddTaskInlineComponent } from './add-task-inline/add-task-inline.component';
import { PlannerDayComponent } from './planner-day/planner-day.component';
import { BetterSimpleDrawerComponent } from '../../ui/better-simple-drawer/better-simple-drawer.component';
import { TaskContextMenuComponent } from '../tasks/task-context-menu/task-context-menu.component';

@NgModule({
  declarations: [
    PlannerComponent,
    PlannerPlanViewComponent,
    AddTaskPanelPlannerComponent,
    PlannerTaskComponent,
    PlannerDayComponent,
    PlannerRepeatProjectionComponent,
    PlannerCalendarEventComponent,
    DialogAddPlannedTasksComponent,
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    UiModule,
    CdkDropList,
    CdkDropListGroup,
    CdkDrag,
    BetterDrawerModule,
    NoteModule,
    TasksModule,
    WorkViewModule,
    TagModule,
    CdkDragPlaceholder,
    IssueModule,
    AddTaskInlineComponent,
    BetterSimpleDrawerComponent,
    TaskContextMenuComponent,
  ],
  exports: [
    PlannerTaskComponent,
    PlannerCalendarEventComponent,
    PlannerRepeatProjectionComponent,
  ],
})
export class PlannerModule {}
