import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
// animations removed for simplicity
import { CommonModule, NgStyle } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { TreeDndComponent } from '../../../ui/tree-dnd/tree.component';
import { MoveInstruction, TreeNode } from '../../../ui/tree-dnd/tree.types';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { NavItem, NavTreeItem } from '../magic-side-nav.model';
import { MagicNavConfigService } from '../magic-nav-config.service';
import { T } from '../../../t.const';

@Component({
  selector: 'nav-list-tree',
  standalone: true,
  imports: [
    CommonModule,
    NgStyle,
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatMenuModule,
    TranslatePipe,
    TreeDndComponent,
    NavItemComponent,
  ],
  templateUrl: './nav-list-tree.component.html',
  styleUrls: ['./nav-list-tree.component.scss', './nav-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavListTreeComponent {
  private readonly _navConfigService = inject(MagicNavConfigService);

  item = input.required<NavTreeItem>();
  showLabels = input<boolean>(true);
  isExpanded = input<boolean>(false);
  activeWorkContextId = input<string | null>(null);

  itemClick = output<NavItem>();

  readonly T = T;

  // Access to service methods and data for visibility menu
  readonly allProjectsExceptInbox = this._navConfigService.allProjectsExceptInbox;

  // Convert nav items to tree nodes - using writable signal for bidirectional updates
  readonly treeNodes = signal<TreeNode<NavItem>[]>([]);

  onHeaderClick(): void {
    this.itemClick.emit(this.item());
  }

  onChildClick(child: any): void {
    this.itemClick.emit(child);
  }

  onTreeUpdated(updatedNodes: TreeNode<NavItem>[]): void {
    this.treeNodes.set(updatedNodes);
  }

  onTreeMoved(_instruction?: MoveInstruction): void {}

  toggleProjectVisibility(projectId: string): void {
    this._navConfigService.toggleProjectVisibility(projectId);
  }
}
