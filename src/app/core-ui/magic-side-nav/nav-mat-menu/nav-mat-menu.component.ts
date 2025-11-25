import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItem, NavMenuItem } from '../magic-side-nav.model';
import { NavItemComponent } from '../nav-item/nav-item.component';

@Component({
  selector: 'nav-mat-menu',
  standalone: true,
  imports: [MatMenuModule, MatIcon, RouterModule, TranslatePipe, NavItemComponent],
  templateUrl: './nav-mat-menu.component.html',
  styleUrl: './nav-mat-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavMatMenuComponent {
  item = input.required<NavMenuItem>();
  showLabels = input<boolean>(true);

  itemClick = output<NavItem>();

  onChildClick(child: NavItem): void {
    this.itemClick.emit(child);
  }
}
