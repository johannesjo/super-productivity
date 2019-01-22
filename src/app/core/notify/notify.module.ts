import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    CommonModule,
    // ServiceWorkerModule.register(SERVICE_WORKER_URL),
  ],
  declarations: [],
})
export class NotifyModule {
  constructor() {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }
}
