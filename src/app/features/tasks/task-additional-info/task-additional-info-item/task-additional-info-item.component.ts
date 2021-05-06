import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'task-additional-info-item',
  templateUrl: './task-additional-info-item.component.html',
  styleUrls: ['./task-additional-info-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAdditionalInfoItemComponent {
  @Input() type: 'input' | 'panel' = 'input';
  @Input() expanded?: boolean = false;
  @Input() inputIcon?: string;

  @Output() collapseParent: EventEmitter<void> = new EventEmitter();
  @Output() keyPress: EventEmitter<KeyboardEvent> = new EventEmitter();
  @Output() editActionTriggered: EventEmitter<void> = new EventEmitter();

  @HostBinding('tabindex') readonly tabindex: number = 3;

  constructor(public elementRef: ElementRef) {}

  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    const tagName = (ev.target as HTMLElement).tagName.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea') {
      return;
    }

    this.keyPress.emit(ev);

    if (ev.key === 'ArrowRight' || ev.key === 'Enter') {
      if (this.type === 'panel') {
        if (this.expanded) {
          this.editActionTriggered.emit();
        } else {
          this.expanded = true;
        }
      } else {
        this.editActionTriggered.emit();
      }
    } else if (ev.key === 'ArrowLeft') {
      if (this.expanded) {
        this.expanded = false;
      } else {
        this.collapseParent.emit();
      }
    }
  }

  focusEl() {
    this.elementRef.nativeElement.focus();
  }

  onInputItemClick() {
    this.editActionTriggered.emit();
    this.focusEl();
  }
}
