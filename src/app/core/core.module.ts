import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceModule } from './persistence/persistence.module';
import { ConfigModule } from './config/config.module';

@NgModule({
  imports: [
    CommonModule,
    ConfigModule,
    PersistenceModule,
  ],
  declarations: []
})
export class CoreModule { }
