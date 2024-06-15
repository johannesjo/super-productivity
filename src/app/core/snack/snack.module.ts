import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { SnackCustomComponent } from './snack-custom/snack-custom.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  imports: [UiModule, CommonModule, MatSnackBarModule],
  declarations: [SnackCustomComponent],
})
export class SnackModule {}
