/**
 * dialog.module
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { OWL_DIALOG_SCROLL_STRATEGY_PROVIDER, OwlDialogService } from './dialog.service';
import { OwlDialogContainerComponent } from './dialog-container.component';

@NgModule({
  imports: [CommonModule, A11yModule, OverlayModule, PortalModule],
  exports: [],
  declarations: [OwlDialogContainerComponent],
  providers: [OWL_DIALOG_SCROLL_STRATEGY_PROVIDER, OwlDialogService],
  // entryComponents: [OwlDialogContainerComponent],
})
export class OwlDialogModule {}
