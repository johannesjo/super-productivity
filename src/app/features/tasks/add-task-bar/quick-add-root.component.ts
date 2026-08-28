import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostBinding,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { AddTaskBarComponent } from './add-task-bar.component';
import { IS_ELECTRON } from '../../../app.constants';
import { QuickAddHudDataFacadeService } from './quick-add-hud-data-facade.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AddTaskBarComponent],
  template: `
    @if (dataFacade.isReady()) {
      <add-task-bar
        class="global"
        [isGlobalBarVariant]="true"
        (closed)="close()"
        (done)="close()"
      ></add-task-bar>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host(.is-fullscreen-shell) {
        --quick-add-hud-bg: var(--bg-lighter);

        min-width: 100vw;
        min-height: 100vh;
        // Transparent until the bar is there to dim *for*: the window is
        // created ahead of time and only shown on demand, so a scrim painted at
        // boot would flash across the whole screen.
        background: transparent;
        transition: background var(--transition-duration-s) ease-out;
      }

      // A barely-there dim behind the bar. Without it the frameless transparent
      // window lets the desktop read straight through the bar's own edges, and
      // the bar looks translucent even though its background is opaque.
      // A literal colour, not a theme token: the theme variables arrive with
      // the snapshot, and a scrim that only resolves later is worse than none.
      :host(.is-fullscreen-shell.is-ready) {
        background: rgba(0, 0, 0, 0.18);
      }

      :host(.is-fullscreen-shell) add-task-bar.global {
        top: 15vh;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddRootComponent implements OnInit {
  readonly dataFacade = inject(QuickAddHudDataFacadeService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _isFullscreenShell =
    new URLSearchParams(window.location.search).get('quickAddFullscreenShell') === '1';

  @HostBinding('class.is-fullscreen-shell')
  get isFullscreenShell(): boolean {
    return this._isFullscreenShell;
  }

  @HostBinding('class.is-ready')
  get isReady(): boolean {
    return this.dataFacade.isReady();
  }

  ngOnInit(): void {
    void this.dataFacade.refreshSnapshot();
    const unsubscribe = this.dataFacade.onHudOpened(() => {
      void this.dataFacade.refreshSnapshot();
    });
    this._destroyRef.onDestroy(unsubscribe);
  }

  close(): void {
    if (IS_ELECTRON) {
      window.quickAdd.closeQuickAdd();
    }
  }

  @HostListener('document:click', ['$event'])
  closeOnShellClick(event: MouseEvent): void {
    if (!this._isFullscreenShell) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('add-task-bar') || target?.closest('.cdk-overlay-container')) {
      return;
    }

    this.close();
  }
}
