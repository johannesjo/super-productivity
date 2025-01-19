import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'celebrate',
  standalone: true,
  imports: [],
  templateUrl: './celebrate.component.html',
  styleUrl: './celebrate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelebrateComponent {}
