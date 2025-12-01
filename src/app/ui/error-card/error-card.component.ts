import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'error-card',
  imports: [MatIcon, MatCardContent, MatCard],
  templateUrl: './error-card.component.html',
  styleUrl: './error-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorCardComponent {
  errorTxt = input.required<string>();
  actionAdvice = input<string>();
}
