import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  ElementRef,
  HostBinding,
  Input,
  QueryList,
  ViewEncapsulation
} from '@angular/core';
import { SplitAreaDirective } from './split-area.directive';
import { SplitHandleComponent } from './split-handle.component';
import { FlexDirective, validateBasis } from '@angular/flex-layout';

const toValue = SplitAreaDirective.basisToValue;
const isBasisPecent = SplitAreaDirective.isPercent;

function getMinMaxPct(minBasis, maxBasis, grow, shrink, baseBasisPct, basisToPx) {
  // minimum and maximum basis determined by max/min inputs
  let minBasisPct = toValue(minBasis) / (isBasisPecent(minBasis) ? 1 : basisToPx);
  let maxBasisPct = toValue(maxBasis) / (isBasisPecent(maxBasis) ? 1 : basisToPx);

  // minimum and maximum basis determined by flex inputs
  minBasisPct = Math.max(minBasisPct || 0, shrink === '0' ? baseBasisPct : 0);
  maxBasisPct = Math.min(maxBasisPct || 100, grow === '0' ? baseBasisPct : 100);

  return [minBasisPct, maxBasisPct];
}

@Component({
  selector: '[ngxSplit]',
  template: `
    <ng-content></ng-content>`,
  styleUrls: ['./split.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class SplitComponent implements AfterContentInit {
  /*tslint:disable*/
  @Input('ngxSplit') direction: string = 'row';

  /*tslint:enable*/

  @HostBinding('class.ngx-split')
  get mainCss() {
    return true;
  }

  @HostBinding('class.row-split')
  get rowCss() {
    return this.direction === 'row';
  }

  @HostBinding('class.column-split')
  get columnCss() {
    return this.direction === 'column';
  }

  @ContentChildren(SplitHandleComponent, {descendants: false})
  handles: QueryList<SplitHandleComponent>;
  @ContentChildren(SplitAreaDirective) areas: QueryList<SplitAreaDirective>;

  constructor(private elementRef: ElementRef) {
  }

  ngAfterContentInit(): void {
    this.handles.forEach(d => d.drag.subscribe(ev => this.onDrag(ev)));
    this.handles.forEach(d => d.dblclick.subscribe(ev => this.onDblClick(ev)));
  }

  onDblClick(ev): void {
    const basisToPx =
      (this.direction === 'row'
        ? this.elementRef.nativeElement.clientWidth
        : this.elementRef.nativeElement.clientHeight) / 100;

    const area = this.areas.first;
    if (!area) return;

    const [grow, shrink, basis] = area.getFlexParts();
    const isPercent = isBasisPecent(basis);
    const basisValue = toValue(basis);

    // get basis in px and %
    const basisPx = isPercent ? basisValue * basisToPx : basisValue;
    const basisPct = basisPx / basisToPx;

    // get baseBasis in percent
    const baseBasis = area.getInputFlexParts()[2];
    const baseBasisPct = toValue(baseBasis) / (isBasisPecent(baseBasis) ? basisToPx : 1);

    const [minBasisPct, maxBasisPct] = getMinMaxPct(
      area.minBasis,
      area.maxBasis,
      grow,
      shrink,
      baseBasisPct,
      basisToPx
    );

    // max and min deltas
    const deltaMin = basisPct - minBasisPct;
    const deltaMax = maxBasisPct - basisPct;

    const delta = deltaMin < deltaMax ? deltaMax : -deltaMin;
    const deltaPx = delta * basisToPx;

    this.resize(deltaPx);
  }

  onDrag({movementX, movementY}): void {
    const deltaPx = this.direction === 'row' ? movementX : movementY;
    this.resize(deltaPx);
  }

  resize(delta: number): void {
    const basisToPx =
      (this.direction === 'row'
        ? this.elementRef.nativeElement.clientWidth
        : this.elementRef.nativeElement.clientHeight) / 100;

    const areas = this.areas.toArray();

    // for now assuming splitter is after first area
    const [first, ...rest] = areas;
    [first].forEach(area => (delta = resizeAreaBy(area, delta)));

    // delta is distributed left to right
    return rest.forEach(area => (delta += resizeAreaBy(area, -delta)));

    function resizeAreaBy(area: SplitAreaDirective, _delta: number) {
      const flex = area.flexDirective as FlexDirective;

      if (area.fxFlexFill) {
        // area is fxFlexFill, distribute delta right
        return _delta;
      }

      const [grow, shrink, basis] = area.getFlexParts();
      const isPercent = isBasisPecent(basis);
      const basisValue = toValue(basis);

      // get baseBasis in percent
      const baseBasis = area.getInputFlexParts()[2];
      const baseBasisPct = toValue(baseBasis) / (isBasisPecent(baseBasis) ? basisToPx : 1);

      // get basis in px and %
      const basisPx = isPercent ? basisValue * basisToPx : basisValue;
      const basisPct = basisPx / basisToPx;

      // determine which dir and calc the diff
      let newBasisPx = basisPx + _delta;
      let newBasisPct = newBasisPx / basisToPx;

      const [minBasisPct, maxBasisPct] = getMinMaxPct(
        area.minBasis,
        area.maxBasis,
        grow,
        shrink,
        baseBasisPct,
        basisToPx
      );

      // obey max and min
      newBasisPct = Math.max(newBasisPct, minBasisPct);
      newBasisPct = Math.min(newBasisPct, maxBasisPct);

      // calculate new basis on px
      newBasisPx = newBasisPct * basisToPx;

      // update flexlayout
      area.updateStyle(isPercent ? newBasisPct : newBasisPx);

      // return actual change in px
      return newBasisPx - basisPx;
    }
  }
}
