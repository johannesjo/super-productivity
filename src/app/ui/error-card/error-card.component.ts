import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiModule } from '../ui.module';

@Component({
  selector: 'error-card',
  standalone: true,
  imports: [UiModule],
  templateUrl: './error-card.component.html',
  styleUrl: './error-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorCardComponent {
  errorTxt = input.required<string>();
  actionAdvice = input<string>();
}
