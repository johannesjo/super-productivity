import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FieldType } from '@ngx-formly/material';

@Component({
  selector: 'keyboard-input',
  templateUrl: './keyboard-input.component.html',
  styleUrls: ['./keyboard-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeyboardInputComponent extends FieldType {
  // @ViewChild(MatInput, {static: true}) formFieldControl: MatInput;

  get type() {
    return this.to.type || 'text';
  }

  onKeyDown(ev: KeyboardEvent) {
    const keyCode = ev.keyCode;

    // the tab key should continue to behave normally
    if (keyCode === 9 || ev.key === 'Tab') {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    // focus out on escape
    if (keyCode === 27 || ev.key === 'Escape') {
      this.formControl.setValue(null);
      if (ev.target instanceof HTMLElement) {
        ev.target.blur();
      }
    } else if (keyCode === 13 || ev.key === 'Enter') {
      // element.blur();
    } else if (keyCode === 16 || keyCode === 17 || keyCode === 18) {
      // don't update if event is for ctrl alt or shift down itself
      return;
    } else {
      let val = '';
      if (ev.ctrlKey) {
        val += 'Ctrl+';
      }
      if (ev.altKey) {
        val += 'Alt+';
      }
      if (ev.shiftKey) {
        val += 'Shift+';
      }
      if (ev.metaKey) {
        val += 'Meta+';
      }

      // custom key handling
      let keyName = ev.key;
      if (keyCode === 32) {
        keyName = 'Space';
      }

      // fail safe for MacOsX crashing bug
      if (keyName === 'Meta') {
      } else {
        this.formControl.setValue(val + keyName);
      }
    }
  }
}
