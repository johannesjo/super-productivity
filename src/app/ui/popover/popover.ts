import {
  ComponentRef,
  ElementRef,
  inject,
  Injectable,
  Injector,
  StaticProvider,
} from '@angular/core';
import {
  ComponentType,
  Overlay,
  ConnectionPositionPair,
  OverlayConfig,
  OverlayRef,
  PositionStrategy,
} from '@angular/cdk/overlay';
import { BasePortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import { PopoverRef } from './popover-ref';
import { CdkPopoverContainerComponent } from './popover-container';

export type PopoverConfig = {
  origin: ElementRef<any>;
};

@Injectable({
  providedIn: 'root',
})
export class Popover {
  private _injector = inject(Injector);
  private _overlay = inject(Overlay);
  overlayRef: OverlayRef | null = null;
  constructor() {}

  open<C = unknown>(component: ComponentType<C>, config: PopoverConfig): PopoverRef<C> {
    const overlayConfig = this._getOverlayConfig(config.origin);
    const overlayRef = this._overlay.create(overlayConfig);
    const popoverRef = new PopoverRef(overlayRef);
    const popoverContainer = this._attachContainer(overlayRef, popoverRef);
    (popoverRef as { containerInstance: BasePortalOutlet }).containerInstance =
      popoverContainer;
    this._attachDialogContent(component, popoverRef, popoverContainer);
    // popoverRef.closed.subscribe()
    return popoverRef as PopoverRef<C>;
  }

  private _getOverlayConfig(origin: ElementRef): OverlayConfig {
    const overlayConfig = new OverlayConfig({
      hasBackdrop: true, // set backdrop to true so we can close the popover when the user
      // clicks outside of it
      backdropClass: 'popover-backdrop',
      panelClass: 'overlay-pane_calendar',
      positionStrategy: this.getOverlayPosition(origin),
      scrollStrategy: this._overlay.scrollStrategies.reposition(),
    });
    return overlayConfig;
  }

  private getOverlayPosition(origin: any): PositionStrategy {
    const positionStrategy = this._overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions(this.getPositions())
      .withPush(false);
    console.log({ positionStrategy });
    return positionStrategy;
  }

  // Get a list of preferred positions
  private getPositions(): ConnectionPositionPair[] {
    return [
      {
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
      },
      {
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
      },
      {
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
      },
    ];
  }
  private _attachContainer<C>(
    overlay: OverlayRef,
    popoverRef: PopoverRef<C>,
  ): BasePortalOutlet {
    const providers: StaticProvider[] = [
      { provide: PopoverRef, useValue: popoverRef },
      { provide: OverlayRef, useValue: overlay },
    ];
    const containerPortal = new ComponentPortal(
      CdkPopoverContainerComponent,
      null,
      Injector.create({ parent: this._injector, providers }),
    );
    const containerRef = overlay.attach(containerPortal);
    return containerRef.instance;
  }
  private _attachDialogContent<C>(
    component: ComponentType<C>,
    popoverRef: PopoverRef<C>,
    popupContainer: BasePortalOutlet,
  ): void {
    const providers: StaticProvider[] = [{ provide: PopoverRef, useValue: popoverRef }];
    const injector = Injector.create({ parent: this._injector, providers });
    const contentRef = popupContainer.attachComponentPortal<C>(
      new ComponentPortal(component, null, injector),
    );
    (popoverRef as { componentRef: ComponentRef<C> }).componentRef = contentRef;
    (popoverRef as { componentInstance: C }).componentInstance = contentRef.instance;
  }
}
