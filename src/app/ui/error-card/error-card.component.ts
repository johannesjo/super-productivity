import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiModule } from '../ui.module';

@Component({
  selector: 'error-card',
  imports: [UiModule],
  templateUrl: './error-card.component.html',
  styleUrl: './error-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorCardComponent {
  errorTxt = input.required<string>();
  actionAdvice = input<string>();
}
