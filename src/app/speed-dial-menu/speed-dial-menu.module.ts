import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeedDialMenuComponent } from './speed-dial-menu.component';
import { UiModule } from '../ui/ui.module';
import { EcoFabSpeedDialModule } from '@ecodev/fab-speed-dial';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    UiModule,
    EcoFabSpeedDialModule,
    RouterModule,
  ],
  declarations: [SpeedDialMenuComponent],
  exports: [SpeedDialMenuComponent]
})
export class SpeedDialMenuModule {
}
