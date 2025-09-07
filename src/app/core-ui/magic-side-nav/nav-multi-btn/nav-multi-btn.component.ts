import { Component, ViewChild, ElementRef, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { NavItem, NavAdditionalButton, NavGroupItem } from '../magic-side-nav';
import { ContextMenuComponent } from '../../../ui/context-menu/context-menu.component';
import { MatMenuItem } from '@angular/material/menu';
import { NavRowComponent } from '../nav-row/nav-row.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'nav-multi-btn',
  standalone: true,
  imports: [
    CommonModule,
    MatIcon,
    MatIconButton,
    MatTooltip,
    ContextMenuComponent,
    MatMenuItem,
    NavRowComponent,
    TranslatePipe,
  ],
  templateUrl: './nav-multi-btn.component.html',
  styleUrl: './nav-multi-btn.component.scss',
})
export class NavMultiBtnComponent {
  item = input.required<NavGroupItem>();
  // Whether labels and badges should be visible (driven by parent nav state)
  showText = input<boolean>(true);
  isGroupExpanded = input<boolean>(false);

  itemClick = output<NavItem>();

  @ViewChild('expandBtn', { read: ElementRef }) expandBtn?: ElementRef;

  onExpandClick(): void {
    this.itemClick.emit(this.item());
  }

  onAdditionalButtonClick(btn: NavAdditionalButton, event: Event): void {
    btn.action?.();
    event.stopPropagation();
  }
}
