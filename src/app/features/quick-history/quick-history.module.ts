import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuickHistoryComponent } from './quick-history.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [QuickHistoryComponent],
  imports: [CommonModule, UiModule],
})
export class QuickHistoryModule {}
