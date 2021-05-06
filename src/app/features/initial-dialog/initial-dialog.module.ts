import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogInitialComponent } from './dialog-initial/dialog-initial.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [DialogInitialComponent],
  imports: [CommonModule, UiModule],
})
export class InitialDialogModule {}
