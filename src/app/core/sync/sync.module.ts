import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectModule } from '../../project/project.module';
import { ConfigModule } from '../config/config.module';
import { GoogleModule } from '../google/google.module';

@NgModule({
  imports: [
    CommonModule,
    ProjectModule,
    ConfigModule,
    GoogleModule,
  ],
  declarations: []
})
export class SyncModule {
}
