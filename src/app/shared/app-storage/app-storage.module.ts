import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStorageService } from './app-storage.service';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: []
})
export class AppStorageModule {
  constructor(private _appStorageService: AppStorageService) {
    _appStorageService.initLsSync();
  }
}
