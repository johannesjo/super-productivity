/**
 * dialog-ref.class
 */
import { AnimationEvent } from '@angular/animations';
import { Location } from '@angular/common';
import { GlobalPositionStrategy, OverlayRef } from '@angular/cdk/overlay';
import { ESCAPE } from '@angular/cdk/keycodes';
import { OwlDialogContainerComponent } from './dialog-container.component';
import { DialogPosition } from './dialog-config.class';
import {
  Observable,
  Subject,
  Subscription,
  SubscriptionLike as ISubscription,
} from 'rxjs';
import { filter, take } from 'rxjs/operators';

export class OwlDialogRef<T> {
  /**
   * The instance of component opened into modal
   * */
  public componentInstance: T;
  /** Whether the user is allowed to close the dialog. */
  public disableClose = this.container.config.disableClose;
  private result: any;
  private _beforeClose$ = new Subject<any>();
  private _afterOpen$ = new Subject<any>();
  private _afterClosed$ = new Subject<any>();
  /** Subscription to changes in the user's location. */
  private locationChanged: ISubscription = Subscription.EMPTY;

  constructor(
    private overlayRef: OverlayRef,
    private container: OwlDialogContainerComponent,
    public readonly id: string,
    location?: Location,
  ) {
    this.container.animationStateChanged
      .pipe(
        filter(
          (event: AnimationEvent) =>
            event.phaseName === 'done' && event.toState === 'enter',
        ),
        take(1),
      )
      .subscribe(() => {
        this._afterOpen$.next();
        this._afterOpen$.complete();
      });

    this.container.animationStateChanged
      .pipe(
        filter(
          (event: AnimationEvent) =>
            event.phaseName === 'done' && event.toState === 'exit',
        ),
        take(1),
      )
      .subscribe(() => {
        this.overlayRef.dispose();
        this.locationChanged.unsubscribe();
        this._afterClosed$.next(this.result);
        this._afterClosed$.complete();
        this.componentInstance = null;
      });

    this.overlayRef
      .keydownEvents()
      .pipe(filter((event) => event.keyCode === ESCAPE && !this.disableClose))
      .subscribe(() => this.close());

    if (location) {
      this.locationChanged = location.subscribe(() => {
        if (this.container.config.closeOnNavigation) {
          this.close();
        }
      });
    }
  }

  public close(dialogResult?: any) {
    this.result = dialogResult;

    this.container.animationStateChanged
      .pipe(
        filter((event: AnimationEvent) => event.phaseName === 'start'),
        take(1),
      )
      .subscribe(() => {
        this._beforeClose$.next(dialogResult);
        this._beforeClose$.complete();
        this.overlayRef.detachBackdrop();
      });

    this.container.startExitAnimation();
  }

  /**
   * Gets an observable that emits when the overlay's backdrop has been clicked.
   */
  public backdropClick(): Observable<any> {
    return this.overlayRef.backdropClick();
  }

  /**
   * Gets an observable that emits when keydown events are targeted on the overlay.
   */
  public keydownEvents(): Observable<KeyboardEvent> {
    return this.overlayRef.keydownEvents();
  }

  /**
   * Updates the dialog's position.
   * @param position New dialog position.
   */
  public updatePosition(position?: DialogPosition): this {
    const strategy = this.getPositionStrategy();

    if (position && (position.left || position.right)) {
      position.left ? strategy.left(position.left) : strategy.right(position.right);
    } else {
      strategy.centerHorizontally();
    }

    if (position && (position.top || position.bottom)) {
      position.top ? strategy.top(position.top) : strategy.bottom(position.bottom);
    } else {
      strategy.centerVertically();
    }

    this.overlayRef.updatePosition();

    return this;
  }

  /**
   * Updates the dialog's width and height.
   * @param width New width of the dialog.
   * @param height New height of the dialog.
   */
  updateSize(width: string = 'auto', height: string = 'auto'): this {
    this.getPositionStrategy().width(width).height(height);
    this.overlayRef.updatePosition();
    return this;
  }

  public isAnimating(): boolean {
    return this.container.isAnimating;
  }

  public afterOpen(): Observable<any> {
    return this._afterOpen$.asObservable();
  }

  public beforeClose(): Observable<any> {
    return this._beforeClose$.asObservable();
  }

  public afterClosed(): Observable<any> {
    return this._afterClosed$.asObservable();
  }

  /** Fetches the position strategy object from the overlay ref. */
  private getPositionStrategy(): GlobalPositionStrategy {
    return this.overlayRef.getConfig().positionStrategy as GlobalPositionStrategy;
  }
}
