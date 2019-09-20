import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SideNavComponent} from './side-nav.component';
import {UiModule} from '../../ui/ui.module';
import {RouterModule} from '@angular/router';

@NgModule({

  imports: [
    UiModule,
    CommonModule,
    RouterModule,
  ],
  declarations: [
    SideNavComponent,
  ],
  exports: [
    SideNavComponent,
  ]
})
export class SideNavModule {
}
