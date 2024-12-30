import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BetterDrawerContainerComponent } from './better-drawer-container/better-drawer-container.component';

@NgModule({
  exports: [BetterDrawerContainerComponent],
  imports: [CommonModule, BetterDrawerContainerComponent],
})
export class BetterDrawerModule {}
