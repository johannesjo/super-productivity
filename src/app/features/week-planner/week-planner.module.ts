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

@NgModule({
  declarations: [
    WeekPlannerComponent,
    WeekPlannerPlanViewComponent,
    AddTaskPanelComponent,
    WeekPlannerTaskComponent,
  ],
  imports: [
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
  ],
})
export class WeekPlannerModule {}
