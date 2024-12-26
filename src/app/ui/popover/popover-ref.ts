import { ComponentRef, TemplateRef } from '@angular//core';
import { OverlayRef } from '@angular/cdk/overlay';
import { BasePortalOutlet } from '@angular/cdk/portal';

export type PopoverContent = TemplateRef<any> | ComponentRef<any>;

export class PopoverRef<C = unknown> {
  readonly componentInstance: C | null = null;
  /**
   * `ComponentRef` of the component opened into the dialog. Will be
   * null when the dialog is opened using a `TemplateRef`
   */
  readonly componentRef: ComponentRef<C> | null = null;
  readonly containerInstance: BasePortalOutlet | null = null;
  constructor(readonly overlayRef: OverlayRef) {}
}
