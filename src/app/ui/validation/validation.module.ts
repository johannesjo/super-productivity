import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MinDirective } from './min.directive';
import { MaxDirective } from './max.directive';

@NgModule({
  imports: [CommonModule, MinDirective, MaxDirective],
  exports: [MinDirective, MaxDirective],
})
export class ValidationModule {}
