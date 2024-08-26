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
  selector: 'task-detail-item',
  templateUrl: './task-detail-item.component.html',
  styleUrls: ['./task-detail-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailItemComponent {
  @Input() type: 'input' | 'panel' = 'input';
  @Input() expanded: boolean = false;
  @Input() inputIcon?: string;

  @Output() collapseParent: EventEmitter<void> = new EventEmitter();
  @Output() keyPress: EventEmitter<KeyboardEvent> = new EventEmitter();
  @Output() editActionTriggered: EventEmitter<void> = new EventEmitter();

  @HostBinding('tabindex') readonly tabindex: number = 3;

  constructor(public elementRef: ElementRef) {}

  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent): void {
    const tagName = (ev.target as HTMLElement).tagName.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea') {
      return;
    }

    this.keyPress.emit(ev);
    if (ev.code === 'Escape') {
      this.collapseParent.emit();
    } else if (ev.key === 'ArrowRight' || ev.key === 'Enter') {
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

  focusEl(): void {
    this.elementRef.nativeElement.focus();
  }

  onInputItemClick(): void {
    this.editActionTriggered.emit();
    this.focusEl();
  }
}
