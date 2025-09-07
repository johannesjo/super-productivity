import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavItem, NavGroupItem } from '../magic-side-nav';
import { NavMultiBtnComponent } from '../nav-multi-btn/nav-multi-btn.component';
import { NavItemComponent } from '../nav-item/nav-item.component';

@Component({
  selector: 'nav-entry',
  standalone: true,
  imports: [CommonModule, NavMultiBtnComponent, NavItemComponent],
  templateUrl: './nav-entry.component.html',
  styleUrl: './nav-entry.component.scss',
})
export class NavEntryComponent {
  // Inputs as signals
  item = input.required<NavItem>();
  // Whether labels and badges should be visible (driven by parent nav state)
  showText = input<boolean>(true);
  isGroupExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  // Output as typed event
  itemClick = output<NavItem>();

  // Derived state
  hasChildren = computed(() => {
    const i = this.item();
    return i.type === 'group' && !!i.children?.length;
  });

  groupItem = computed<NavGroupItem | null>(() => {
    const i = this.item();
    return i.type === 'group' ? i : null;
  });

  onItemClick(): void {
    this.itemClick.emit(this.item());
  }

  onChildClick(child: NavItem): void {
    this.itemClick.emit(child);
  }
}
