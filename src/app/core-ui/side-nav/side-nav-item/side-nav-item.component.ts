import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  input,
  ViewChild,
} from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { UiModule } from '../../../ui/ui.module';
import { WorkContextMenuModule } from '../../work-context-menu/work-context-menu.module';
import {
  WorkContextCommon,
  WorkContextType,
} from '../../../features/work-context/work-context.model';
import { MatMenuTrigger } from '@angular/material/menu';
import { Project } from '../../../features/project/project.model';

@Component({
  selector: 'side-nav-item',
  standalone: true,
  imports: [RouterLink, UiModule, WorkContextMenuModule, RouterModule],
  templateUrl: './side-nav-item.component.html',
  styleUrl: './side-nav-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNavItemComponent {
  workContext = input.required<WorkContextCommon>();
  type = input.required<WorkContextType>();
  ico = input.required<string>();
  activeWorkContextId = input.required<string>();

  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };
  @ViewChild('contextMenuTriggerEl', { static: true, read: MatMenuTrigger })
  contextMenu!: MatMenuTrigger;

  @HostBinding('class.hasTasks')
  get workContextHasTasks(): boolean {
    return this.workContext().taskIds.length > 0;
  }

  @HostBinding('class.isActiveContext')
  get isActiveContext(): boolean {
    return this.workContext().id === this.activeWorkContextId();
  }

  @HostBinding('class.isHidden')
  get isHidden(): boolean {
    return (this.workContext() as Project)?.isHiddenFromMenu;
  }

  openContextMenu(event: TouchEvent | MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.contextMenuPosition.x =
      ('touches' in event ? event.touches[0].clientX : event.clientX) + 'px';
    this.contextMenuPosition.y =
      ('touches' in event ? event.touches[0].clientY : event.clientY) + 'px';
    this.contextMenu.openMenu();
  }
}
