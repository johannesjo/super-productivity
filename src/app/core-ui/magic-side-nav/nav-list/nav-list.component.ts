import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NavGroupItem, NavItem } from '../magic-side-nav';
import { NavRowComponent } from '../nav-row/nav-row.component';
import { NavItemComponent } from '../nav-item/nav-item.component';

@Component({
  selector: 'nav-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    TranslatePipe,
    NavRowComponent,
    NavItemComponent,
  ],
  templateUrl: './nav-list.component.html',
})
export class NavListComponent {
  item = input.required<NavGroupItem>();
  showText = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();

  onHeaderClick(): void {
    this.itemClick.emit(this.item());
  }
}
