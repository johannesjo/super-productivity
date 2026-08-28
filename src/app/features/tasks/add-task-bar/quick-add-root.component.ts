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
      <div class="hud-scrim"></div>
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

      /* NOTE: angular.json sets no inlineStyleLanguage, so this block is parsed
         as plain CSS — a "//" comment is not a comment here and silently eats
         the declaration or rule that follows it. Keep every comment in this
         block in this form. */

      :host(.is-fullscreen-shell) {
        /* An opaque base for the bar to sit on. A theme is free to define its
           surfaces translucent: inside the app they composite over the window
           background, but this window has none, so painting the bar with a
           theme token alone lets the desktop read straight through it. A
           literal rather than a token, because no token is guaranteed opaque. */
        --quick-add-hud-base-bg: #fff;
        --quick-add-hud-bg: var(--bg-lighter);

        min-width: 100vw;
        min-height: 100vh;
        background: transparent;
      }

      :host-context(.isDarkTheme) {
        --quick-add-hud-base-bg: #1e1e1e;
      }

      /* Its own element rather than a background on the host, because the host
         is app-root, which page.scss forces transparent with !important so the
         frameless window does not paint the app background over the desktop.
         Nothing painted on the host can win against that.

         Rendered only once the snapshot has landed, so the dim arrives with the
         bar: the window is created ahead of time and shown on demand, and a
         scrim painted at boot would flash across the whole screen. */
      :host(.is-fullscreen-shell) .hud-scrim {
        position: fixed;
        inset: 0;
        background: var(--scrim, rgba(0, 0, 0, 0.4));
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
