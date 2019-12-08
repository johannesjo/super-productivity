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

  @HostBinding('tabindex') tabindex = 3;


  @HostListener('keydown', ['$event']) onKeyDown(ev: KeyboardEvent) {
    this.keyPress.emit(ev);
    // tslint:disable-next-line
    if (ev.key === 'ArrowRight' && !this.expanded) {
      this.expanded = true;
      // tslint:disable-next-line
    } else if (ev.key === 'ArrowLeft') {
      if (this.expanded) {
        this.expanded = false;
      } else {
        this.collapseParent.emit();
      }
    } else if (ev.key === 'Enter') {
      this.enterPress.emit();
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
}
