import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  EmbeddedViewRef,
  inject,
  ViewChild,
} from '@angular/core';
import { OverlayRef } from '@angular/cdk/overlay';
import {
  BasePortalOutlet,
  CdkPortalOutlet,
  ComponentPortal,
  TemplatePortal,
} from '@angular/cdk/portal';
import { PopoverRef } from './popover-ref';

@Component({
  selector: 'popover-container',
  templateUrl: './popover-container.component.html',
  styleUrl: './popover-container.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CdkPortalOutlet],
  host: {
    class: 'cdk-popover-container',
  },
})
export class CdkPopoverContainerComponent extends BasePortalOutlet {
  private _overlayRef = inject(OverlayRef);
  @ViewChild(CdkPortalOutlet, { static: true }) _portalOutlet!: CdkPortalOutlet;
  renderMethod: 'template' | 'component' = 'component';
  context: any;
  constructor(private popoverRef: PopoverRef) {
    super();
  }
  attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    console.log(this._portalOutlet);
    const result = this._portalOutlet.attachComponentPortal(portal);
    return result;
  }
  attachTemplatePortal<T>(portal: TemplatePortal<T>): EmbeddedViewRef<T> {
    const result = this._portalOutlet.attachTemplatePortal(portal);
    // this._contentAttached() // TODO: check if this is necessary
    return result;
  }
}
