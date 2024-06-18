/**
 * dialog-config.class
 */
import { ViewContainerRef } from '@angular/core';
import { NoopScrollStrategy, ScrollStrategy } from '@angular/cdk/overlay';

let uniqueId = 0;

/** Possible overrides for a dialog's position. */
export interface DialogPosition {
  /** Override for the dialog's top position. */
  top?: string;

  /** Override for the dialog's bottom position. */
  bottom?: string;

  /** Override for the dialog's left position. */
  left?: string;

  /** Override for the dialog's right position. */
  right?: string;
}

export interface OwlDialogConfigInterface {
  /**
   * ID of the element that describes the dialog.
   */
  ariaDescribedBy?: string | null;

  /**
   * Whether to focus the dialog when the dialog is opened
   */
  autoFocus?: boolean;

  /** Whether the dialog has a backdrop. */
  hasBackdrop?: boolean;

  /**
   * Custom style for the backdrop
   * */
  backdropStyle?: any;

  /** Data being injected into the child component. */
  data?: any;

  /** Whether the user can use escape or clicking outside to close a modal. */
  disableClose?: boolean;

  /**
   * ID for the modal. If omitted, a unique one will be generated.
   */
  id?: string;

  /**
   * The ARIA role of the dialog element.
   */
  role?: 'dialog' | 'alertdialog';

  /**
   * Custom class for the pane
   * */
  paneClass?: string | string[];

  /**
   * Mouse Event
   * */
  event?: MouseEvent;

  /**
   * Custom class for the backdrop
   * */
  backdropClass?: string | string[];

  /**
   * Whether the dialog should close when the user goes backwards/forwards in history.
   * */
  closeOnNavigation?: boolean;

  /** Width of the dialog. */
  width?: string;

  /** Height of the dialog. */
  height?: string;

  /**
   * The min-width of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  minWidth?: number | string;

  /**
   * The min-height of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  minHeight?: number | string;

  /**
   * The max-width of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  maxWidth?: number | string;

  /**
   * The max-height of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  maxHeight?: number | string;

  /** Position overrides. */
  position?: DialogPosition;

  /**
   * The scroll strategy when the dialog is open
   * Learn more this from https://material.angular.io/cdk/overlay/overview#scroll-strategies
   * */
  scrollStrategy?: ScrollStrategy;

  viewContainerRef?: ViewContainerRef;
}

export class OwlDialogConfig implements OwlDialogConfigInterface {
  /**
   * ID of the element that describes the dialog.
   */
  public ariaDescribedBy: string | null = null;

  /**
   * Whether to focus the dialog when the dialog is opened
   */
  public autoFocus = true;

  /** Whether the dialog has a backdrop. */
  public hasBackdrop = true;

  /**
   * Custom style for the backdrop
   * */
  public backdropStyle: any;

  /** Data being injected into the child component. */
  public data: any = null;

  /** Whether the user can use escape or clicking outside to close a modal. */
  public disableClose = false;

  /**
   * ID for the modal. If omitted, a unique one will be generated.
   */
  public id: string;

  /**
   * The ARIA role of the dialog element.
   */
  public role: 'dialog' | 'alertdialog' = 'dialog';

  /**
   * Custom class for the pane
   * */
  public paneClass: string | string[] = '';

  /**
   * Mouse Event
   * */
  // TODO check
  // @ts-ignore
  public event: MouseEvent = null;

  /**
   * Custom class for the backdrop
   * */
  public backdropClass: string | string[] = '';

  /**
   * Whether the dialog should close when the user goes backwards/forwards in history.
   * */
  public closeOnNavigation = true;

  /** Width of the dialog. */
  public width = '';

  /** Height of the dialog. */
  public height = '';

  /**
   * The min-width of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  public minWidth!: number | string;

  /**
   * The min-height of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  public minHeight!: number | string;

  /**
   * The max-width of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  public maxWidth: number | string = '85vw';

  /**
   * The max-height of the overlay panel.
   * If a number is provided, pixel units are assumed.
   * */
  public maxHeight!: number | string;

  /** Position overrides. */
  public position!: DialogPosition;

  /**
   * The scroll strategy when the dialog is open
   * Learn more this from https://material.angular.io/cdk/overlay/overview#scroll-strategies
   * */
  public scrollStrategy: ScrollStrategy = new NoopScrollStrategy();

  public viewContainerRef!: ViewContainerRef;

  constructor() {
    this.id = `owl-dialog-${uniqueId++}`;
  }
}
