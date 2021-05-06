import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplitComponent } from './split.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  imports: [CommonModule, MatIconModule, MatButtonModule],
  exports: [SplitComponent],
  declarations: [SplitComponent],
})
export class SplitModule {}
