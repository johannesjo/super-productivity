import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceService } from './persistence.service';
import { DatabaseService } from './database.service';

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [],
  providers: [
    PersistenceService,
    DatabaseService,
  ]
})
export class PersistenceModule {
}
