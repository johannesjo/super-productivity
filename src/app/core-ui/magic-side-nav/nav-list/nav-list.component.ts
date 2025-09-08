import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavGroupItem, NavItem } from '../magic-side-nav.model';

@Component({
  selector: 'nav-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    TranslatePipe,
    NavItemComponent,
  ],
  templateUrl: './nav-list.component.html',
  styleUrl: './nav-list.component.scss',
})
export class NavSectionComponent {
  item = input.required<NavGroupItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();

  onHeaderClick(): void {
    this.itemClick.emit(this.item());
  }
}
