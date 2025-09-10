import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
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
import { filter, map, startWith } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { TODAY_TAG } from '../../../features/tag/tag.const';
import { WorkContextType } from '../../../features/work-context/work-context.model';
import { setActiveWorkContext } from '../../../features/work-context/store/work-context.actions';
import { Subscription } from 'rxjs';
import { WorkContextService } from '../../../features/work-context/work-context.service';

@Component({
  selector: 'page-title',
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
        class="page-title"
        mat-ripple
        routerLink="/active/tasks"
      >
        {{ displayTitle() }}
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

      .page-title {
        font-size: 18px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
        cursor: pointer;
        border-radius: var(--card-border-radius);
        padding: var(--s) var(--s2) var(--s) var(--s);

        @media (min-width: 600px) {
          padding-left: 0;
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
        .page-title:hover + & {
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageTitleComponent implements OnDestroy {
  private _breakpointObserver = inject(BreakpointObserver);
  private _router = inject(Router);
  private _store = inject(Store);
  private _workContextService = inject(WorkContextService);
  private _subs = new Subscription();

  readonly T = T;

  // Get data directly from services instead of inputs
  activeWorkContextTitle = toSignal(this._workContextService.activeWorkContextTitle$);
  activeWorkContextTypeAndId = toSignal(
    this._workContextService.activeWorkContextTypeAndId$,
  );

  // Route detection observables
  private _isScheduleSection$ = this._router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => !!event.urlAfterRedirects.match(/(schedule)$/)),
    startWith(!!this._router.url.match(/(schedule)$/)),
  );
  isScheduleSection = toSignal(this._isScheduleSection$, { initialValue: false });

  private _isPlannerSection$ = this._router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => !!event.urlAfterRedirects.match(/(planner)$/)),
    startWith(!!this._router.url.match(/(planner)$/)),
  );
  isPlannerSection = toSignal(this._isPlannerSection$, { initialValue: false });

  private _isBoardsSection$ = this._router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map((event) => !!event.urlAfterRedirects.match(/(boards)$/)),
    startWith(!!this._router.url.match(/(boards)$/)),
  );
  isBoardsSection = toSignal(this._isBoardsSection$, { initialValue: false });

  // Override title for special routes
  displayTitle = computed(() => {
    if (this.isScheduleSection()) {
      return 'Schedule';
    }
    if (this.isPlannerSection()) {
      return 'Planner';
    }
    if (this.isBoardsSection()) {
      return 'Boards';
    }
    return this.activeWorkContextTitle();
  });

  private _isXxxs$ = this._breakpointObserver.observe('(max-width: 350px)');
  isXxxs = toSignal(this._isXxxs$.pipe(map((result) => result.matches)), {
    initialValue: false,
  });

  constructor() {
    // Switch to TODAY context when navigating to schedule/planner/boards
    this._subs.add(
      this._router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          map((event) => event.urlAfterRedirects),
          startWith(this._router.url), // Handle initial page load
          filter(
            (url) =>
              !!url.match(/(schedule)$/) ||
              !!url.match(/(planner)$/) ||
              !!url.match(/(boards)$/),
          ),
        )
        .subscribe(() => {
          // Check if we're not already in TODAY context
          const currentContext = this.activeWorkContextTypeAndId();
          if (!currentContext || currentContext.activeId !== TODAY_TAG.id) {
            this._store.dispatch(
              setActiveWorkContext({
                activeId: TODAY_TAG.id,
                activeType: WorkContextType.TAG,
              }),
            );
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }
}
