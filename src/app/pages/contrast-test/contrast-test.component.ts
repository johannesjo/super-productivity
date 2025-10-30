import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'contrast-test',
  imports: [MatButtonModule, MatIconModule, MatTabsModule, MatMenuModule],
  templateUrl: './contrast-test.component.html',
  styleUrl: './contrast-test.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ContrastTestComponent {}
