import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BetterDrawerContainerComponent } from './better-drawer-container/better-drawer-container.component';

@NgModule({
  declarations: [BetterDrawerContainerComponent],
  exports: [BetterDrawerContainerComponent],
  imports: [CommonModule],
})
export class BetterDrawerModule {}
