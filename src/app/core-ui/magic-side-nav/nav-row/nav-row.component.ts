import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'nav-row',
  standalone: true,
  imports: [CommonModule, MatIcon, TranslatePipe],
  templateUrl: './nav-row.component.html',
  styleUrl: './nav-row.component.scss',
})
export class NavRowComponent {
  @Input() icon?: string;
  @Input() svgIcon?: string;
  @Input() label?: string;
  @Input() badge?: string | number;
  @Input() showLabels = true;
  @Input() showChevron = false;
  @Input() labelClass?: string;
}
