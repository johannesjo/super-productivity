import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FieldWrapper, FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { expandAnimation } from '../animations/expand.ani';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'formly-collapsible',
  templateUrl: './formly-collapsible.component.html',
  styleUrl: './formly-collapsible.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isExpanded]': 'isExpanded()',
  },
  imports: [MatIcon, FormlyModule, TranslatePipe],
})
export class FormlyCollapsibleComponent
  extends FieldWrapper
  implements OnInit, OnDestroy
{
  private static _states = new Map<string, boolean>();
  private _timeout?: number;

  isExpanded = signal(false);
  isAnimationEnabled = signal(false);

  ngOnInit(): void {
    const key = this.props?.['label'] || 'collapsible';

    // Restore state
    if (FormlyCollapsibleComponent._states.has(key)) {
      this.isExpanded.set(FormlyCollapsibleComponent._states.get(key)!);
    }

    // Enable animations after render
    this._timeout = window.setTimeout(() => this.isAnimationEnabled.set(true), 100);
  }

  ngOnDestroy(): void {
    if (this._timeout) window.clearTimeout(this._timeout);
  }

  toggle(): void {
    const newValue = !this.isExpanded();
    this.isExpanded.set(newValue);
    FormlyCollapsibleComponent._states.set(
      this.props?.['label'] || 'collapsible',
      newValue,
    );
  }

  isValid(field: FormlyFieldConfig): boolean {
    if (field.key) {
      return !!field.formControl?.valid;
    }

    return field.fieldGroup
      ? field.fieldGroup.every((f: FormlyFieldConfig) => this.isValid(f))
      : true;
  }
}
