import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectModule } from '../../project/project.module';
import { ConfigModule } from '../../config/config.module';
import { PersistenceModule } from '../../core/persistence/persistence.module';
import { TasksModule } from '../../tasks/tasks.module';

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
