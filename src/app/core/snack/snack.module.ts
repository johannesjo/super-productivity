import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromSnack from './store/snack.reducer';
import { EffectsModule } from '@ngrx/effects';
import { SnackEffects } from './store/snack.effects';
import { MatSnackBarModule } from '@angular/material';
import { SnackCustomComponent } from './snack-custom/snack-custom.component';
import { UiModule } from '../../ui/ui.module';
import { SnackGoogleLoginComponent } from './snack-google-login/snack-google-login.component';

@NgModule({
  imports: [
    UiModule,
    CommonModule,
    MatSnackBarModule,
    StoreModule.forFeature('snack', fromSnack.reducer),
    EffectsModule.forFeature([SnackEffects])
  ],
  declarations: [
    SnackCustomComponent,
    SnackGoogleLoginComponent
  ],
  entryComponents: [
    SnackCustomComponent,
    SnackGoogleLoginComponent
  ],
})
export class SnackModule {

}

