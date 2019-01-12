import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigModule } from '../../features/config/config.module';
import { PersistenceModule } from '../../core/persistence/persistence.module';
import { TasksModule } from '../../features/tasks/tasks.module';
import { SyncService } from './sync.service';

@NgModule({
  imports: [
    CommonModule,
    TasksModule,
    ConfigModule,
    PersistenceModule,
  ],
  declarations: [],
  providers: [SyncService]
})
export class SyncModule {
}
