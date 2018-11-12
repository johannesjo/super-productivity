import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackModule } from '../snack/snack.module';
import { NotifyService } from './notify.service';

@NgModule({
  imports: [
    CommonModule,
    SnackModule,
    // ServiceWorkerModule.register(SERVICE_WORKER_URL),
  ],
  declarations: [],
  providers: [
    NotifyService,
  ]
})
export class NotifyModule {
  constructor() {
    Notification.requestPermission();
  }
}
