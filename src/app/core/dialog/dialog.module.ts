import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from './dialog.service';
import { StoreModule } from '@ngrx/store';
import * as fromDialog from './store/dialog.reducer';
import { EffectsModule } from '@ngrx/effects';
import { DialogEffects } from './store/dialog.effects';
import { DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature('dialog', fromDialog.reducer),
    EffectsModule.forFeature([DialogEffects])
  ],
  declarations: [DialogConfirmComponent],
  providers: [DialogService]
})
export class DialogModule {
}
