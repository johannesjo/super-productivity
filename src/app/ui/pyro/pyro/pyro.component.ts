import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'pyro',
  standalone: true,
  imports: [],
  templateUrl: './pyro.component.html',
  styleUrl: './pyro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PyroComponent {}
