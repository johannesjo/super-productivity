import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatRipple } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuContent, MatMenuTrigger } from '@angular/material/menu';
import { WorkContextMenuComponent } from '../../work-context-menu/work-context-menu.component';
import { TranslatePipe } from '@ngx-translate/core';
import { T } from '../../../t.const';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'work-context-title',
  standalone: true,
  imports: [
    RouterLink,
    MatRipple,
    MatTooltip,
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuContent,
    MatMenuTrigger,
    WorkContextMenuComponent,
    TranslatePipe,
  ],
  template: `
    @if (activeWorkContextTypeAndId()) {
      <div
        [matTooltip]="T.MH.GO_TO_TASK_LIST | translate"
        class="current-work-context-title"
        mat-ripple
        routerLink="/active/tasks"
      >
        {{ title() }}
      </div>
      @if (!isXxxs()) {
        <button
          [mat-menu-trigger-for]="activeWorkContextMenu"
          [matTooltip]="T.MH.PROJECT_MENU | translate"
          class="project-settings-btn"
          mat-icon-button
        >
          <mat-icon>more_vert</mat-icon>
        </button>
      }
      <mat-menu #activeWorkContextMenu="matMenu">
        <ng-template matMenuContent>
          <work-context-menu
            [contextId]="activeWorkContextTypeAndId()!.activeId"
            [contextType]="activeWorkContextTypeAndId()!.activeType"
          ></work-context-menu>
        </ng-template>
      </mat-menu>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .current-work-context-title {
        font-size: 18px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
        cursor: pointer;
        border-radius: var(--card-border-radius);
        padding: var(--s) var(--s2) var(--s) var(--s);

        @media (min-width: 600px) {
          padding-right: var(--s);
        }

        &:focus {
          outline: none;
        }
      }

      .project-settings-btn {
        display: none;
        @media (min-width: 600px) {
          display: block;
          transition: var(--transition-standard);
          opacity: 0;
          margin-right: var(--s2);
          margin-left: calc(-1 * var(--s));
          position: relative;
          z-index: 1;
        }

        &:hover,
        .current-work-context-title:hover + & {
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkContextTitleComponent {
  private _breakpointObserver = inject(BreakpointObserver);

  readonly T = T;
  readonly title = input.required<string>();
  readonly activeWorkContextTypeAndId = input<{
    activeId: string;
    activeType: 'PROJECT' | 'TAG';
  } | null>();

  private _isXxxs$ = this._breakpointObserver.observe('(max-width: 350px)');
  isXxxs = toSignal(this._isXxxs$.pipe(map((result) => result.matches)), {
    initialValue: false,
  });
}
