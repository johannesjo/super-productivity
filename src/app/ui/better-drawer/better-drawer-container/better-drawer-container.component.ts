import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, OnInit, Output} from '@angular/core';
import {fadeAnimation} from '../../animations/fade.ani';
import {DomSanitizer, SafeStyle} from '@angular/platform-browser';

@Component({
  selector: 'better-drawer-container',
  templateUrl: './better-drawer-container.component.html',
  styleUrls: ['./better-drawer-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation]
})
export class BetterDrawerContainerComponent implements OnInit {
  @Input() sideWidth: number;

  @Input() set isOpen(v: boolean) {
    this._isOpen = v;
    this._updateStyle();
  }

  @HostBinding('class.isOpen') get isOpenGet() {
    return this._isOpen;
  }

  @Input() set isOver(v: boolean) {
    this._isOver = v;
    this._updateStyle();
  }

  @HostBinding('class.isOver') get isOverGet() {
    return this._isOver;
  }

  @Output() wasClosed = new EventEmitter<void>();

  public sideStyle: SafeStyle;

  private _isOpen: boolean;
  private _isOver: boolean;


  constructor(private _domSanitizer: DomSanitizer) {
  }

  ngOnInit(): void {
    this._updateStyle();
  }

  onBackdropClicked() {
    this.wasClosed.emit();
  }

  private _updateStyle() {
    const style = (this.isOverGet)
      ? (this.isOpenGet)
        ? 'right: 0;'
        : `right: -100%;`
      : (this.isOpenGet)
        ? 'margin-right: 0;'
        : `margin-right: ${-1 * this.sideWidth}%;`
    ;
    const widthStyle = ` width: ${this.sideWidth}%;`;
    this.sideStyle = this._domSanitizer.bypassSecurityTrustStyle(style + widthStyle);

  }
}
