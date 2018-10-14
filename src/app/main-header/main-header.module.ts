import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainHeaderComponent } from './main-header.component';
import { CoreModule } from '../core/core.module';
import { UiModule } from '../ui/ui.module';
import { ProjectModule } from '../project/project.module';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
    ProjectModule,
    RouterModule,
  ],
  declarations: [MainHeaderComponent],
  exports: [MainHeaderComponent],
})
export class MainHeaderModule {
}
