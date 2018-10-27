import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromSnack from './store/snack.reducer';
import { EffectsModule } from '@ngrx/effects';
import { SnackEffects } from './store/snack.effects';
import { MatSnackBarModule } from '@angular/material';

@NgModule({
  imports: [
    CommonModule,
    MatSnackBarModule,
    StoreModule.forFeature('snack', fromSnack.reducer),
    EffectsModule.forFeature([SnackEffects])
  ],
  declarations: []
})
export class SnackModule {

}

