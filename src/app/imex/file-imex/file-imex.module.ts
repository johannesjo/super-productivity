import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileImexComponent } from './file-imex.component';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [CommonModule, FormsModule, UiModule],
  declarations: [FileImexComponent],
  exports: [FileImexComponent],
})
export class FileImexModule {}
