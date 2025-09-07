import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavItem } from '../magic-side-nav';
import { NavItemInnerComponent } from '../nav-item-inner/nav-item-inner.component';

@Component({
  selector: 'nav-item',
  standalone: true,
  imports: [CommonModule, RouterModule, NavItemInnerComponent],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.css',
})
export class SpNavItemComponent {
  item = input.required<NavItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);
  isChild = input<boolean>(false);

  itemClick = output<NavItem>();

  linkClass = computed(() => (this.isChild() ? 'nav-child-link' : 'nav-link'));
  hasChildren = computed(() => {
    const i = this.item();
    return i.type === 'group' && !!i.children?.length;
  });
  shouldShowTooltip = computed(() => !this.showLabels() && !!this.item().label);

  onItemClick(): void {
    this.itemClick.emit(this.item());
  }
}
