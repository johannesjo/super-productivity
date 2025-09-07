import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavItem } from '../magic-side-nav';
import { SideNavItemComponent } from '../../side-nav/side-nav-item/side-nav-item.component';
import { NavMultiBtnComponent } from '../nav-multi-btn/nav-multi-btn.component';
import { NavRowComponent } from '../nav-row/nav-row.component';

@Component({
  selector: 'nav-entry',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SideNavItemComponent,
    NavMultiBtnComponent,
    NavRowComponent,
  ],
  templateUrl: './nav-entry.component.html',
  styleUrl: './nav-entry.component.scss',
})
export class NavEntryComponent {
  @Input({ required: true }) item!: NavItem;
  // Whether labels and badges should be visible (driven by parent nav state)
  @Input() showText = true;
  @Input() isGroupExpanded: boolean = false;
  @Input() activeWorkContextId: string | null = null;

  @Output() itemClick = new EventEmitter<NavItem>();

  onItemClick(): void {
    this.itemClick.emit(this.item);
  }

  onChildClick(child: NavItem): void {
    this.itemClick.emit(child);
  }
}
