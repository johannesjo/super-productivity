import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DialogInitialComponent} from './dialog-initial/dialog-initial.component';


@NgModule({
  declarations: [DialogInitialComponent],
  entryComponents: [DialogInitialComponent],
  imports: [
    CommonModule
  ]
})
export class InitialDialogModule {
}
