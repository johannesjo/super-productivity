import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  input,
  output,
  inject,
} from '@angular/core';
import { ReplaySubject, Subscription } from 'rxjs';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';

@Component({
  selector: 'better-simple-drawer',
  imports: [],
  templateUrl: './better-simple-drawer.component.html',
  styleUrl: './better-simple-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BetterSimpleDrawerComponent implements OnInit, OnDestroy {
  private _domSanitizer = inject(DomSanitizer);

  readonly sideWidth = input<number>(0);
  readonly wasClosed = output<void>();
  contentEl$: ReplaySubject<HTMLElement> = new ReplaySubject<HTMLElement>(1);

  sideStyle: SafeStyle = '';
  private _subs: Subscription = new Subscription();

  @HostBinding('class.isOpen') get isOpenGet(): boolean {
    return this._isOpen;
  }

  // TODO: Skipped for migration because:
  //  Accessor queries cannot be migrated as they are too complex.
  @ViewChild('contentElRef', { read: ElementRef }) set setContentElRef(ref: ElementRef) {
    this.contentEl$.next(ref.nativeElement);
  }

  private _isOpen: boolean = false;

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set isOpen(v: boolean) {
    this._isOpen = v;
    this._updateStyle();
  }

  private _isOver: boolean = false;

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set isOver(v: boolean) {
    this._isOver = v;
    this._updateStyle();
  }

  ngOnInit(): void {
    this._updateStyle();
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  updateStyleAfterTransition(): void {
    if (!this.isOpenGet) {
      this.sideStyle = this._domSanitizer.bypassSecurityTrustStyle(
        this._getWidthRelatedStyles() + ' visibility: hidden;',
      );
    }
  }

  close(): void {
    // FORCE blur because otherwise task notes won't save
    if (IS_TOUCH_PRIMARY) {
      document.querySelectorAll('input,textarea').forEach((element) => {
        if (element === document.activeElement) {
          return (element as HTMLElement).blur();
        }
      });
    }
    this.wasClosed.emit();
  }

  private _getWidthRelatedStyles(): string {
    const widthStyle = ` width: ${this.sideWidth()}px;`;

    return this.isOpenGet
      ? `margin-right: 0; ${widthStyle}`
      : `margin-right: ${-1 * this.sideWidth()}px; ${widthStyle}`;
  }

  private _updateStyle(): void {
    this.sideStyle = this._domSanitizer.bypassSecurityTrustStyle(
      this._getWidthRelatedStyles(),
    );
  }

  protected readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
}
