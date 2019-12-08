import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnInit,
  Output
} from '@angular/core';

@Component({
  selector: 'task-additional-info-item',
  templateUrl: './task-additional-info-item.component.html',
  styleUrls: ['./task-additional-info-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskAdditionalInfoItemComponent implements OnInit {
  @Input() type: 'input' | 'panel' = 'input';
  @Input() expanded: boolean;
  @Input() inputIcon: string;

  @Output() collapseParent = new EventEmitter<void>();
  @Output() enterPress = new EventEmitter<void>();
  @Output() keyPress = new EventEmitter<KeyboardEvent>();
  @Output() editActionTriggered = new EventEmitter<void>();

  @HostBinding('tabindex') tabindex = 3;


  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this.keyPress.emit(ev);
    if (ev.key === 'ArrowRight') {
      if (this.type === 'panel') {
        this.expanded = true;
      } else {
        this.editActionTriggered.emit();
      }
    } else if (ev.key === 'ArrowLeft') {
      if (this.expanded) {
        this.expanded = false;
      } else {
        this.collapseParent.emit();
      }
    } else if (ev.key === 'Enter') {
      this.enterPress.emit();
      this.editActionTriggered.emit();

      if (!this.expanded) {
        this.expanded = true;
      }
    }
  }

  constructor(
    public elementRef: ElementRef
  ) {
  }

  ngOnInit() {
  }

  focusEl() {
    this.elementRef.nativeElement.focus();
  }

  onInputItemClick() {
    this.editActionTriggered.emit();
    this.focusEl();
  }
}
