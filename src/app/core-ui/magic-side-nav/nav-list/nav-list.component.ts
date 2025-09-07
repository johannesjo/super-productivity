import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NavGroupItem, NavItem } from '../magic-side-nav';
import { NavRowComponent } from '../nav-row/nav-row.component';
import { SpNavItemComponent } from '../nav-item/nav-item.component';

@Component({
  selector: 'sp-nav-section',
  standalone: true,
  imports: [
    CommonModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    TranslatePipe,
    NavRowComponent,
    SpNavItemComponent,
  ],
  templateUrl: './nav-list.component.html',
  styles: [
    `
      :host {
        display: contents;
      }
      .g-multi-btn-wrapper {
        display: flex;
        align-items: center;
        position: relative;
      }
      .nav-link {
        display: flex;
        align-items: center;
        gap: var(--s2);
        padding: var(--s2) var(--s2);
        color: var(--sidebar-text);
        text-decoration: none;
        border-radius: 8px;
        transition: all 0.2s ease;
        cursor: pointer;
        background: transparent;
        border: none;
        width: 100%;
        text-align: left;
        position: relative;
      }
      .nav-link:hover {
        background: var(--sidebar-hover);
      }
      .nav-link.active {
        background: var(--sidebar-active);
        color: var(--sidebar-active-text);
      }
      .nav-link.expanded .nav-chevron {
        transform: rotate(180deg);
      }
      .additional-btn {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        min-width: 32px;
        padding: 4px;
        margin-left: var(--s);
        color: var(--sidebar-text-secondary);
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .additional-btn:hover {
        background-color: var(--sidebar-hover);
        color: var(--sidebar-text);
      }
      .additional-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .nav-children {
        list-style: none;
        padding: 0;
        margin: 4px 0 0 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      .nav-children.visible {
        max-height: 500px;
      }
      .nav-child-item {
        margin-left: var(--s3);
      }
    `,
  ],
})
export class SpNavSectionComponent {
  item = input.required<NavGroupItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();

  onHeaderClick(): void {
    this.itemClick.emit(this.item());
  }
}
