import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import * as fromSnack from './store/snack.reducer';
import { SNACK_FEATURE_NAME } from './store/snack.reducer';
import { EffectsModule } from '@ngrx/effects';
import { SnackEffects } from './store/snack.effects';
import { MatSnackBarModule } from '@angular/material';
import { SnackCustomComponent } from './snack-custom/snack-custom.component';
import { UiModule } from '../../ui/ui.module';
import { SnackGoogleLoginComponent } from './snack-google-login/snack-google-login.component';
import { SnackJiraUnblockComponent } from './snack-jira-unblock/snack-jira-unblock.component';

@NgModule({
  imports: [
    UiModule,
    CommonModule,
    MatSnackBarModule,
    StoreModule.forFeature(SNACK_FEATURE_NAME, fromSnack.reducer),
    EffectsModule.forFeature([SnackEffects])
  ],
  declarations: [
    SnackCustomComponent,
    SnackGoogleLoginComponent,
    SnackJiraUnblockComponent,
  ],
  entryComponents: [
    SnackCustomComponent,
    SnackGoogleLoginComponent,
    SnackJiraUnblockComponent,
  ],
})
export class SnackModule {

}

