import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItem } from '../magic-side-nav';
import { SideNavItemComponent } from '../../side-nav/side-nav-item/side-nav-item.component';
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
})
export class NavItemComponent {
  @Input({ required: true }) item!: NavItem;
  @Input() showText = true;
  @Input() isExpanded = false;
  @Input() activeWorkContextId: string | null = null;
  @Input() isChild = false;

  @Output() itemClick = new EventEmitter<NavItem>();

  get linkClass(): string {
    return this.isChild ? 'nav-child-link' : 'nav-link';
  }

  get itemClass(): string {
    return this.isChild ? 'nav-child-item' : 'nav-item';
  }

  onItemClick(): void {
    this.itemClick.emit(this.item);
  }

  shouldShowTooltip(): boolean {
    return !this.showText && !!this.item.label;
  }
}
