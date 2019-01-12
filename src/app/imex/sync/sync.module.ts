import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectModule } from '../../features/project/project.module';
import { ConfigModule } from '../../features/config/config.module';
import { PersistenceModule } from '../../core/persistence/persistence.module';
import { TasksModule } from '../../features/tasks/tasks.module';

@NgModule({
  imports: [
    CommonModule,
    ProjectModule,
    TasksModule,
    ConfigModule,
    PersistenceModule,
  ],
  declarations: []
})
export class SyncModule {
}
