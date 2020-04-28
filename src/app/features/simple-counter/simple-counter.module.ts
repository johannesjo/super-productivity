import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SimpleCounterButtonComponent} from './simple-counter-button/simple-counter-button.component';
import {UiModule} from '../../ui/ui.module';


@NgModule({
  declarations: [
    SimpleCounterButtonComponent,
  ],
  exports: [
    SimpleCounterButtonComponent,
  ],
  imports: [
    CommonModule,
    UiModule
  ]
})
export class SimpleCounterModule {
}
