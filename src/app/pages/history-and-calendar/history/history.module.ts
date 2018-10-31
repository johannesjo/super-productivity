import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryComponent } from './history.component';
import { CoreModule } from '../../../core/core.module';
import { UiModule } from '../../../ui/ui.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    UiModule,
  ],
  declarations: [HistoryComponent],
  exports: [HistoryComponent],
})
export class HistoryModule { }
