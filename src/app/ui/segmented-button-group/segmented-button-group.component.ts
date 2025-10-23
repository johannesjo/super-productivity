import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostBinding,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

export interface SegmentedButtonOption {
  id: string | number;
  labelKey: string;
  hintKey?: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'segmented-button-group',
  standalone: true,
  imports: [TranslateModule, MatIconModule, MatTooltip],
  templateUrl: './segmented-button-group.component.html',
  styleUrls: ['./segmented-button-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedButtonGroupComponent {
  readonly options = input.required<readonly SegmentedButtonOption[]>();
  readonly selectedId = input<string | number | null>(null);
  readonly ariaLabel = input<string>('');
  readonly size = input<'md' | 'lg'>('lg');

  readonly selectionChange = output<string | number>();

  @HostBinding('attr.data-size')
  get sizeAttr(): string {
    return this.size();
  }

  private readonly _buttonRefs =
    viewChildren<ElementRef<HTMLButtonElement>>('segmentButton');

  readonly focusableIndex = computed(() => {
    const options = this.options();
    const selectedIdx = options.findIndex((option) => option.id === this.selectedId());

    if (selectedIdx >= 0 && !options[selectedIdx].disabled) {
      return selectedIdx;
    }

    return options.findIndex((option) => !option.disabled) ?? 0;
  });

  isActive(option: SegmentedButtonOption): boolean {
    return option.id === this.selectedId();
  }

  onSelect(id: string | number | undefined): void {
    if (id === undefined) {
      return;
    }

    const option = this.options().find((opt) => opt.id === id);

    if (!option || option.disabled) {
      return;
    }

    if (id !== this.selectedId()) {
      this.selectionChange.emit(id);
    }
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    const options = this.options();

    if (!options.length) {
      return;
    }

    let targetIndex = index;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        targetIndex = this._findNextEnabledIndex(index, 1);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        targetIndex = this._findNextEnabledIndex(index, -1);
        break;
      }
      case 'Home': {
        event.preventDefault();
        targetIndex = this._findNextEnabledIndex(-1, 1);
        break;
      }
      case 'End': {
        event.preventDefault();
        targetIndex = this._findNextEnabledIndex(options.length, -1);
        break;
      }
      case ' ':
      case 'Enter': {
        event.preventDefault();
        this.onSelect(options[index]?.id);
        this._focusButton(index);
        return;
      }
      default:
        return;
    }

    if (targetIndex !== index && options[targetIndex]) {
      this.onSelect(options[targetIndex].id);
      queueMicrotask(() => {
        this._focusButton(targetIndex);
      });
    }
  }

  private _findNextEnabledIndex(start: number, direction: 1 | -1): number {
    const options = this.options();
    const len = options.length;

    if (!len) {
      return start;
    }

    let current = start;

    for (let i = 0; i < len; i++) {
      current = (current + direction + len) % len;
      const option = options[current];

      if (option && !option.disabled) {
        return current;
      }
    }

    return start;
  }

  private _focusButton(index: number): void {
    const buttons = this._buttonRefs();
    const button = buttons[index]?.nativeElement;
    if (button) {
      button.focus();
    }
  }
}
