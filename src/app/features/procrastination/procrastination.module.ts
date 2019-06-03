import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ProcrastinationComponent} from './procrastination.component';
import {UiModule} from '../../ui/ui.module';
import {TasksModule} from '../tasks/tasks.module';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    TasksModule,
  ],
  declarations: [
    ProcrastinationComponent,
  ],
})
export class ProcrastinationModule {
}
