import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackModule } from '../snack/snack.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { NotifyService, SERVICE_WORKER_URL } from './notify.service';

@NgModule({
  imports: [
    CommonModule,
    SnackModule,
    ServiceWorkerModule.register(SERVICE_WORKER_URL),
  ],
  declarations: [],
  providers: [
    NotifyService,
  ]
})
export class NotifyModule {
  constructor(
    private _notifyService: NotifyService,
  ) {
    Notification.requestPermission();

    setTimeout(() => {
      this._notifyService.notify({body: 'TEST'});
    }, 2000);
  }
}
