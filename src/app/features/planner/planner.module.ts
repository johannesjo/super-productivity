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

@NgModule({
  declarations: [
    PlannerComponent,
    PlannerPlanViewComponent,
    AddTaskPanelComponent,
    PlannerTaskComponent,
    PlannerRepeatProjectionComponent,
    PlannerCalendarEventComponent,
  ],
  imports: [
    StoreModule.forFeature(plannerFeature),
    EffectsModule.forFeature([PlannerEffects]),
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
  ],
})
export class PlannerModule {}
