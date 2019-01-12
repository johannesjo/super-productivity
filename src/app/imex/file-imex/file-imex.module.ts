import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileImexComponent } from './file-imex.component';
import { SyncModule } from '../sync/sync.module';
import { UiModule } from '../../ui/ui.module';
import { FormsModule } from '@angular/forms';
import { MigrateModule } from '../migrate/migrate.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    SyncModule,
    MigrateModule,
  ],
  declarations: [
    FileImexComponent,
  ],
  entryComponents: [
    FileImexComponent,
  ],
  exports: [
    FileImexComponent,
  ]
})
export class FileImexModule {
}
