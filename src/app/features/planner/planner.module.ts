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
import { AddTaskPanelComponent } from './add-task-panel/add-task-panel.component';
import { TagModule } from '../tag/tag.module';
import { PlannerTaskComponent } from './planner-task/planner-task.component';
import { PlannerRepeatProjectionComponent } from './planner-repeat-projection/planner-repeat-projection.component';
import { PlannerCalendarEventComponent } from './planner-calendar-event/planner-calendar-event.component';
import { IssueModule } from '../issue/issue.module';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { plannerFeature } from './store/planner.reducer';
import { PlannerEffects } from './store/planner.effects';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogAddPlannedTasksComponent } from './dialog-add-planned-tasks/dialog-add-planned-tasks.component';
import { AddTaskInlineComponent } from './add-task-inline/add-task-inline.component';
import { PlannerDayComponent } from './planner-day/planner-day.component';
import { BetterSimpleDrawerComponent } from '../../ui/better-simple-drawer/better-simple-drawer.component';
import { PlannerInitialDialogEffects } from './store/planner-initial-dialog.effects';

@NgModule({
  declarations: [
    PlannerComponent,
    PlannerPlanViewComponent,
    AddTaskPanelComponent,
    PlannerTaskComponent,
    PlannerDayComponent,
    PlannerRepeatProjectionComponent,
    PlannerCalendarEventComponent,
    DialogAddPlannedTasksComponent,
  ],
  imports: [
    StoreModule.forFeature(plannerFeature),
    EffectsModule.forFeature([PlannerEffects, PlannerInitialDialogEffects]),
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
  ],
  exports: [
    PlannerTaskComponent,
    PlannerCalendarEventComponent,
    PlannerRepeatProjectionComponent,
  ],
})
export class PlannerModule {}
