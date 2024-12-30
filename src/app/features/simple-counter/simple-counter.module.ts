import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleCounterButtonComponent } from './simple-counter-button/simple-counter-button.component';
import { UiModule } from '../../ui/ui.module';
import { SimpleCounterCfgComponent } from './simple-counter-cfg/simple-counter-cfg.component';
import { DialogSimpleCounterEditComponent } from './dialog-simple-counter-edit/dialog-simple-counter-edit.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, UiModule, FormsModule, ReactiveFormsModule],
  declarations: [
    SimpleCounterButtonComponent,
    SimpleCounterCfgComponent,
    DialogSimpleCounterEditComponent,
  ],
  exports: [SimpleCounterButtonComponent, SimpleCounterCfgComponent],
})
export class SimpleCounterModule {}
