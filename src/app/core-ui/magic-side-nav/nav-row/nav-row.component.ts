import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'nav-row',
  standalone: true,
  imports: [CommonModule, MatIcon, TranslatePipe],
  template: `
    <!-- Icon -->
    @if (svgIcon) {
      <mat-icon
        class="nav-icon"
        [svgIcon]="svgIcon"
      ></mat-icon>
    } @else if (icon) {
      <mat-icon class="nav-icon">{{ icon }}</mat-icon>
    }

    <!-- Label -->
    @if (showText && label) {
      <span
        class="nav-label"
        [class]="labelClass"
        >{{ label | translate }}</span
      >
    }

    <!-- Badge -->
    @if (showText && badge !== undefined && badge !== null && badge !== '') {
      <span class="nav-badge">{{ badge }}</span>
    }

    <!-- Chevron (optional) -->
    @if (showText && showChevron) {
      <svg
        class="nav-chevron"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    }
  `,
})
export class NavRowComponent {
  @Input() icon: string | undefined;
  @Input() svgIcon: string | undefined;
  @Input() label: string | undefined;
  @Input() badge: string | number | undefined | null;
  @Input() showText = true;
  @Input() showChevron = false;
  @Input() labelClass = '';
}
