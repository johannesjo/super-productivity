import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalProgressBarComponent } from './global-progress-bar.component';
import { UiModule } from '../../ui/ui.module';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { GlobalProgressBarInterceptorService } from './global-progress-bar-interceptor.service';

@NgModule({
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: GlobalProgressBarInterceptorService,
      multi: true,
    },
  ],
  declarations: [GlobalProgressBarComponent],
  imports: [CommonModule, UiModule],
  exports: [GlobalProgressBarComponent],
})
export class GlobalProgressBarModule {}
