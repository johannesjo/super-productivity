import { NgModule } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { Popover } from './popover';
import { CdkPopoverContainerComponent } from './popover-container';

@NgModule({
  imports: [OverlayModule, PortalModule, CdkPopoverContainerComponent],
  exports: [PortalModule, CdkPopoverContainerComponent],
  providers: [Popover],
})
export class PopoverModule {}
