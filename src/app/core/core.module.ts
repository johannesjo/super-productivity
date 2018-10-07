import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersistenceModule } from './persistence/persistence.module';

@NgModule({
  imports: [
    CommonModule,
    PersistenceModule,
  ],
  declarations: []
})
export class CoreModule { }
