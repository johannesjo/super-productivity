import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';

@Component({
  selector: 'inline-input',
  templateUrl: './inline-input.component.html',
  styleUrls: ['./inline-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InlineInputComponent implements OnInit {
  @Input() type = 'text';
  @Input() value: string | number;
  @Input() displayValue: string;
  @Input() newValue: string | number;
  @Output() changed = new EventEmitter<string | number>();
  @ViewChild('inputEl') inputEl: ElementRef;

  constructor() {
  }


  ngOnInit() {
  }

  blur() {
    if (this.newValue || this.newValue === '' || this.newValue === 0) {
      this.changed.emit(this.newValue);
    }
  }

  onChange(v) {
    console.log(v);

    this.newValue = v;
  }

  focusInput() {
    this.inputEl.nativeElement.focus();
  }
}
