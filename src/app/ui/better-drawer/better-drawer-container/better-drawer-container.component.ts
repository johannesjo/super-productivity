import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { fadeAnimation } from '../../animations/fade.ani';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { LanguageService } from '../../../core/language/language.service';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter, map, switchMap, startWith } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { SwipeDirective } from '../../swipe-gesture/swipe.directive';
import { CssString, StyleObject, StyleObjectToString } from '../../../util/styles';

@Component({
  selector: 'better-drawer-container',
  templateUrl: './better-drawer-container.component.html',
  styleUrls: ['./better-drawer-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isOpen]': 'isOpen()',
  },
  imports: [SwipeDirective],
  standalone: true,
})
export class BetterDrawerContainerComponent {
  private _domSanitizer = inject(DomSanitizer);
  private _languageService = inject(LanguageService);
  private _router = inject(Router);

  readonly sideWidth = input<number>(0);
  // Optional pixel-based width for the side panel (overrides percentage when provided)
  readonly sideWidthPx = input<number | null>(null);
  readonly isOpen = input<boolean>(false);
  readonly wasClosed = output<void>();

  readonly isRTL = this._languageService.isLangRTL;

  readonly sideStyle = computed<SafeStyle>(() => {
    const styles =
      this._getWidthRelatedStyles() +
      (this._shouldSkipAnimation() ? ' transition: none;' : '');
    return this._domSanitizer.bypassSecurityTrustStyle(styles);
  });

  // Skip animations during navigation using RxJS
  private readonly _skipAnimationDuringNav = toSignal(
    this._router.events.pipe(
      filter(
        (event) => event instanceof NavigationStart || event instanceof NavigationEnd,
      ),
      map((event) => event instanceof NavigationStart),
      // When navigation starts, immediately return true
      // When navigation ends, delay returning false by 100ms
      switchMap((isNavigating) =>
        isNavigating ? of(true) : timer(100).pipe(map(() => false)),
      ),
      startWith(false), // Start with animations enabled
    ),
    { initialValue: false },
  );

  // Computed signal that determines if animations should be skipped
  private readonly _shouldSkipAnimation = computed(() => this._skipAnimationDuringNav());

  updateStyleAfterTransition(): void {
    // Handle visibility after transition ends
    if (!this.isOpen()) {
      // We could update styles here if needed, but the drawer handles this via CSS
    }
  }

  close(): void {
    // FORCE blur because otherwise task notes won't save
    if (IS_TOUCH_PRIMARY) {
      document.querySelectorAll('input,textarea').forEach((element) => {
        if (element === document.activeElement) {
          return (element as HTMLElement).blur();
        }
      });
    }
    this.wasClosed.emit();
  }

  private _getWidthRelatedStyles(): CssString {
    const isOpen = this.isOpen();

    // Prefer pixel width when provided, otherwise fall back to percentage
    const px = this.sideWidthPx();
    const widthVal = px != null && px > 0 ? `${px}px` : `${this.sideWidth()}%`;

    const styles: StyleObject = { width: isOpen ? widthVal : '0' };

    return StyleObjectToString(styles);
  }

  protected readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
}
