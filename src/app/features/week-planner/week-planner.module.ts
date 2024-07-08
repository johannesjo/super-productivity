import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeekPlannerComponent } from './week-planner.component';
import { WeekPlannerPlanViewComponent } from './week-planner-plan-view/week-planner-plan-view.component';
import { UiModule } from '../../ui/ui.module';
import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { BetterDrawerModule } from '../../ui/better-drawer/better-drawer.module';
import { NoteModule } from '../note/note.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkViewModule } from '../work-view/work-view.module';

@NgModule({
  declarations: [WeekPlannerComponent, WeekPlannerPlanViewComponent],
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
  ],
})
export class WeekPlannerModule {}
