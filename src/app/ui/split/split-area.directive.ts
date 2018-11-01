import { Directive, HostBinding, Input, Optional, Self } from '@angular/core';
import { FlexDirective, validateBasis } from '@angular/flex-layout';

@Directive({
  selector: '[ngxSplitArea]'
})
export class SplitAreaDirective {
  static isPercent(basis: string): boolean {
    const hasCalc = String(basis).indexOf('calc') > -1;
    return String(basis).indexOf('%') > -1 && !hasCalc;
  }

  static basisToValue(basis: string) {
    if (typeof basis === 'string') {
      return Number(basis.replace('%', '').replace('px', ''));
    }
    return basis;
  }

  @Input()
  minBasis: string;

  @Input()
  maxBasis: string;

  @Input()
  fxFlex: string;

  @HostBinding('class.ngx-split-area')
  get cssClass() {
    return true;
  }

  get fxFlexFill(): boolean {
    return this.fxFlex === '';
  }

  constructor(
    @Optional()
    @Self()
    public flexDirective: FlexDirective
  ) {
  }

  getFlexParts() {
    const flex = this.flexDirective as any;
    const basis = flex._queryInput('flex') || '1 1 1e-9px';
    return validateBasis(
      String(basis).replace(';', ''),
      (flex as any)._queryInput('grow'),
      (flex as any)._queryInput('shrink')
    );
  }

  getInputFlexParts() {
    const flex = this.flexDirective as any;
    const basis = this.fxFlex || '1 1 1e-9px';
    return validateBasis(
      String(basis).replace(';', ''),
      (flex as any)._queryInput('grow'),
      (flex as any)._queryInput('shrink')
    );
  }

  updateStyle(flexBasis?: string | number) {
    const flex: any = this.flexDirective as any;
    if (typeof flexBasis === 'undefined') {
      flexBasis = flex._queryInput('flex') || '';
    }
    if (typeof flexBasis === 'number') {
      flexBasis = this.isPercent() ? `${flexBasis}%` : `${flexBasis}px`;
    }

    const grow = flex._queryInput('grow');
    const shrink = flex._queryInput('shrink');

    if (flexBasis.indexOf(' ') < 0) {
      flexBasis = [grow, shrink, flexBasis].join(' ');
    }

    flex._cacheInput('flex', flexBasis);
    flex._updateStyle(flexBasis);
  }

  isPercent(basis?: string): boolean {
    if (!basis) {
      const flex = this.flexDirective as any;
      basis = flex._queryInput('flex') || '1 1 1e-9px';
    }
    const hasCalc = String(basis).indexOf('calc') > -1;
    return String(basis).indexOf('%') > -1 && !hasCalc;
  }
}