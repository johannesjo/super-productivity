import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekPlannerComponent } from './week-planner.component';
import { WeekPlannerPlanViewComponent } from './week-planner-plan-view/week-planner-plan-view.component';
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
import { WeekPlannerTaskComponent } from './week-planner-task/week-planner-task.component';
import { WeekPlannerRepeatProjectionComponent } from './week-planner-repeat-projection/week-planner-repeat-projection.component';
import { WeekPlannerCalendarEventComponent } from './week-planner-calendar-event/week-planner-calendar-event.component';
import { IssueModule } from '../issue/issue.module';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { weekPlannerFeature } from './store/week-planner.reducer';
import { WeekPlannerEffects } from './store/week-planner.effects';

@NgModule({
  declarations: [
    WeekPlannerComponent,
    WeekPlannerPlanViewComponent,
    AddTaskPanelComponent,
    WeekPlannerTaskComponent,
    WeekPlannerRepeatProjectionComponent,
    WeekPlannerCalendarEventComponent,
  ],
  imports: [
    StoreModule.forFeature(weekPlannerFeature),
    EffectsModule.forFeature([WeekPlannerEffects]),
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
export class WeekPlannerModule {}
