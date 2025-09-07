import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItem } from '../magic-side-nav';
import { SideNavItemComponent } from '../side-nav-item/side-nav-item.component';
import { NavRowComponent } from '../nav-row/nav-row.component';

@Component({
  selector: 'nav-item',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    TranslatePipe,
    SideNavItemComponent,
    NavRowComponent,
  ],
  templateUrl: './nav-item.component.html',
  styles: [
    `
      :host {
        display: contents;
      }
      .nav-link,
      .nav-child-link {
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
      .nav-link:hover,
      .nav-child-link:hover {
        background: var(--sidebar-hover);
      }
      .nav-link.active,
      .nav-child-link.active {
        background: var(--sidebar-active);
        color: var(--sidebar-active-text);
      }
      .nav-child-link {
        padding: var(--s) var(--s2);
        color: var(--sidebar-text-secondary);
        border-radius: 6px;
        font-size: 14px;
      }
      .nav-child-link:hover {
        color: var(--sidebar-text);
      }
    `,
  ],
})
export class NavItemComponent {
  item = input.required<NavItem>();
  showText = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);
  isChild = input<boolean>(false);

  itemClick = output<NavItem>();

  linkClass = computed(() => (this.isChild() ? 'nav-child-link' : 'nav-link'));
  hasChildren = computed(() => {
    const i = this.item();
    return i.type === 'group' && !!i.children?.length;
  });
  shouldShowTooltip = computed(() => !this.showText() && !!this.item().label);

  onItemClick(): void {
    this.itemClick.emit(this.item());
  }
}
