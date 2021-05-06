import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagTaskPageComponent } from './tag-task-page.component';
import { WorkViewModule } from '../../features/work-view/work-view.module';

@NgModule({
  declarations: [TagTaskPageComponent],
  imports: [CommonModule, WorkViewModule],
})
export class TagTaskPageModule {}
