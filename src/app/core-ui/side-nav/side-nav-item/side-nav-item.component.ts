import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  input,
  ViewChild,
} from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { UiModule } from '../../../ui/ui.module';

import {
  WorkContextCommon,
  WorkContextType,
} from '../../../features/work-context/work-context.model';
import { Project } from '../../../features/project/project.model';
import { WorkContextMenuComponent } from '../../work-context-menu/work-context-menu.component';
import { ContextMenuComponent } from '../../../ui/context-menu/context-menu.component';

@Component({
  selector: 'side-nav-item',
  standalone: true,
  imports: [
    RouterLink,
    UiModule,
    RouterModule,
    WorkContextMenuComponent,
    ContextMenuComponent,
  ],
  templateUrl: './side-nav-item.component.html',
  styleUrl: './side-nav-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideNavItemComponent {
  workContext = input.required<WorkContextCommon>();
  type = input.required<WorkContextType>();
  defaultIcon = input.required<string>();
  activeWorkContextId = input.required<string>();

  contextMenuPosition: { x: string; y: string } = { x: '0px', y: '0px' };

  @ViewChild('routeBtn', { static: true, read: ElementRef })
  routeBtn!: ElementRef;

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

  focus(): void {
    this.routeBtn.nativeElement.focus();
  }
}
