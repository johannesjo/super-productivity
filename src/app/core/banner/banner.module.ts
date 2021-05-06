import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerComponent } from './banner/banner.component';
import { UiModule } from '../../ui/ui.module';

@NgModule({
  declarations: [BannerComponent],
  imports: [CommonModule, UiModule],
  exports: [BannerComponent],
})
export class BannerModule {}
