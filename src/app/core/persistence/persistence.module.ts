import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromPersistence from './store/persistence.reducer';
import { EffectsModule } from '@ngrx/effects';
import { PersistenceEffects } from './store/persistence.effects';
import { PersistenceService } from './persistence.service';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature('persistence', fromPersistence.reducer),
    EffectsModule.forFeature([PersistenceEffects])
  ],
  declarations: [],
  providers: [
    PersistenceService
  ]
})
export class PersistenceModule {
}
