import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  forwardRef,
  signal,
  computed,
  effect,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'impact-stars',
  imports: [MatIconModule],
  templateUrl: './impact-stars.component.html',
  styleUrls: ['./impact-stars.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImpactStarsComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpactStarsComponent implements ControlValueAccessor {
  /** 0..maxStars (inclusive). Default 4. */
  @Input() maxStars = 4;
  /** Disable user interaction. */
  @Input() disabled = false;
  /** Make read-only (focusable for a11y, but not clickable). */
  @Input() readonly = false;

  /** ARIA labels */
  @Input() ariaLabel = 'Impact rating';
  @Input() zeroLabel = 'No impact';
  @Input() lowLabel = 'Low impact';
  @Input() highLabel = 'High impact';

  /** Emits on change (0..maxStars). */
  @Output() valueChange = new EventEmitter<number>();

  // Icons
  activeIcon = 'star';
  inactiveIcon = 'star_border';

  // Internal state
  private _value = signal(0); // committed
  private _hover = signal<number | null>(null); // preview index or null

  value = computed(() => this._hover() ?? this._value());

  stars = computed(() => Array.from({ length: this.maxStars }, (_, i) => i + 1));

  constructor() {
    // Ensure value never exceeds maxStars if input changes dynamically
    effect(() => {
      if (this._value() > this.maxStars) this._value.set(this.maxStars);
    });
  }

  // ControlValueAccessor
  onChange: (v: number) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(v: number): void {
    const next = this.sanitize(v);
    this._value.set(next);
  }
  registerOnChange(fn: (v: number) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // UI handlers
  setValue(v: number): void {
    if (this.disabled || this.readonly) return;
    const next = this.sanitize(v);
    this._value.set(next);
    this._hover.set(null);
    this.onChange(next);
    this.valueChange.emit(next);
    this.onTouched();
  }
  preview(v: number | null): void {
    if (this.disabled || this.readonly) return;
    this._hover.set(v);
  }
  handleClick(idx: number): void {
    if (this.disabled || this.readonly) return;
    const committed = this._value();
    const next = committed === idx ? 0 : idx;
    this.setValue(next);
  }
  isActive(idx: number): boolean {
    return this.value() >= idx;
  }
  starLabel(idx: number): string {
    // e.g., "1 star (low impact)" … "4 stars (high impact)"
    if (idx === 1) return `star (${this.lowLabel})`;
    if (idx === this.maxStars) return `stars (${this.highLabel})`;
    return 'stars';
  }
  track = (_: number, v: number): number => v;

  // Keyboard a11y: Left/Down -> -1, Right/Up -> +1, Home -> 0, End -> max
  onKeydown(ev: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;
    const key = ev.key;
    if (key === 'ArrowRight' || key === 'ArrowUp') {
      ev.preventDefault();
      this.setValue(Math.min(this._value() + 1, this.maxStars));
    } else if (key === 'ArrowLeft' || key === 'ArrowDown') {
      ev.preventDefault();
      this.setValue(Math.max(this._value() - 1, 0));
    } else if (key === 'Home') {
      ev.preventDefault();
      this.setValue(0);
    } else if (key === 'End') {
      ev.preventDefault();
      this.setValue(this.maxStars);
    } else if (key === ' ' || key === 'Enter') {
      ev.preventDefault();
      this.setValue(this.value()); // commit preview or current
    }
  }

  private sanitize(v: number): number {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(this.maxStars, Math.round(v)));
  }
}
