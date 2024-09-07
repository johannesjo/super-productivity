import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SideNavComponent } from './side-nav.component';
import { UiModule } from '../../ui/ui.module';
import { RouterModule } from '@angular/router';
import { DragulaModule } from 'ng2-dragula';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { PlannerModule } from '../../features/planner/planner.module';
import { ScheduleEventComponent } from '../../features/schedule/schedule-event/schedule-event.component';
import { WorkContextMenuComponent } from '../work-context-menu/work-context-menu.component';
import { SideNavItemComponent } from './side-nav-item/side-nav-item.component';
import { ContextMenuComponent } from '../../ui/context-menu/context-menu.component';

@NgModule({
  imports: [
    UiModule,
    CommonModule,
    RouterModule,
    DragulaModule,
    WorkContextMenuComponent,
    CdkDropList,
    CdkDrag,
    PlannerModule,
    ScheduleEventComponent,
    SideNavItemComponent,
    ContextMenuComponent,
  ],
  declarations: [SideNavComponent],
  exports: [SideNavComponent],
})
export class SideNavModule {}
