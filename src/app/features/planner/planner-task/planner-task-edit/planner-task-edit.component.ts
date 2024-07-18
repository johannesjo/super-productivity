import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'planner-task-edit',
  templateUrl: './planner-task-edit.component.html',
  styleUrl: './planner-task-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerTaskEditComponent implements AfterViewInit {
  @Input() set value(value: string) {
    this.tmpValue = value;
  }

  tmpValue?: string;

  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() cancel: EventEmitter<void> = new EventEmitter<void>();

  constructor(private _el: ElementRef) {}

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit');
    if (this._el.nativeElement) {
      this._el.nativeElement.querySelector('textarea').focus();
    }
  }

  handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.cancel.emit();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.valueChange.emit(this._cleanValue(this.tmpValue));
    }
  }

  blurred(): void {
    this.valueChange.emit(this._cleanValue(this.tmpValue));
  }

  updateTmpValue(value: string): void {
    this.tmpValue = value;
  }

  private _cleanValue(value: string = ''): string {
    return value.replace(/\r\n|\n|\r/g, '').trim();
  }
}
