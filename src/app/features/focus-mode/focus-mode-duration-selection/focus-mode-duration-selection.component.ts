import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Task } from '../../tasks/task.model';

@Component({
  selector: 'focus-mode-duration-selection',
  templateUrl: './focus-mode-duration-selection.component.html',
  styleUrls: ['./focus-mode-duration-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusModeDurationSelectionComponent {
  @Input() focusModeDuration = 25 * 60 * 1000;
  @Input() task: Task | null = null;
  @Output() focusModeDurationSelected: EventEmitter<number> = new EventEmitter();

  constructor() {}

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
