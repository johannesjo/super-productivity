import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'nav-row',
  standalone: true,
  imports: [CommonModule, MatIcon, TranslatePipe],
  templateUrl: './nav-row.component.html',
  styles: [
    `
      :host {
        display: contents;
      }
      .nav-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--sidebar-text-secondary);
        font-size: 18px;
        line-height: 1;
      }
      .nav-label {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nav-badge {
        flex-shrink: 0;
        padding: 2px 8px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--sidebar-text);
        font-size: 11px;
        font-weight: 500;
      }
      .nav-chevron {
        flex-shrink: 0;
        color: var(--sidebar-text-secondary);
      }
    `,
  ],
})
export class NavRowComponent {
  @Input() icon?: string;
  @Input() svgIcon?: string;
  @Input() label?: string;
  @Input() badge?: string | number;
  @Input() showText = true;
  @Input() showChevron = false;
  @Input() labelClass?: string;
}
