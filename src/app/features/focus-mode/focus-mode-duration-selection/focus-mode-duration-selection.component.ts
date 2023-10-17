import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { Task } from '../../tasks/task.model';

@Component({
  selector: 'focus-mode-duration-selection',
  templateUrl: './focus-mode-duration-selection.component.html',
  styleUrls: ['./focus-mode-duration-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeDurationSelectionComponent implements AfterViewInit, OnDestroy {
  @Input() focusModeDuration = 25 * 60 * 1000;
  @Input() task: Task | null = null;
  @Output() focusModeDurationSelected: EventEmitter<number> = new EventEmitter();
  focusTimeout = 0;

  constructor() {}

  ngAfterViewInit(): void {
    this.focusTimeout = window.setTimeout(() => {
      const el = document.querySelector('input');
      (el as HTMLElement).focus();
      (el as any).select();
    }, 200);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.focusTimeout);
  }

  onFocusModeDurationChanged(duration: number): void {
    this.focusModeDuration = duration;
  }

  onSubmit($event: SubmitEvent): void {
    console.log('duration selected', this.focusModeDuration);

    $event.preventDefault();
    if (this.focusModeDuration) {
      this.focusModeDurationSelected.emit(this.focusModeDuration);
    }
  }
}
