import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { fadeAnimation } from '../../animations/fade.ani';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { MainContainerClass } from '../../../app.constants';
import { LanguageService } from '../../../core/language/language.service';
import { IS_TOUCH_PRIMARY } from '../../../util/is-mouse-primary';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter, map, switchMap, startWith } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { SwipeDirective } from '../../swipe-gesture/swipe.directive';

const SMALL_CONTAINER_WIDTH = 620;
const VERY_SMALL_CONTAINER_WIDTH = 450;

@Component({
  selector: 'better-drawer-container',
  templateUrl: './better-drawer-container.component.html',
  styleUrls: ['./better-drawer-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  host: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isOpen]': 'isOpen()',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    '[class.isOver]': 'isOver()',
  },
  imports: [SwipeDirective],
  standalone: true,
})
export class BetterDrawerContainerComponent implements OnDestroy {
  private _elementRef = inject(ElementRef);
  private _domSanitizer = inject(DomSanitizer);
  private _languageService = inject(LanguageService);
  private _router = inject(Router);

  readonly sideWidth = input<number>(0);
  readonly isOpen = input<boolean>(false);
  readonly isOver = input<boolean>(false);
  readonly wasClosed = output<void>();

  readonly contentElRef = viewChild<ElementRef>('contentElRef');

  private _containerWidth = signal<number>(0);
  private _resizeObserver: ResizeObserver | null = null;

  readonly isRTL = this._languageService.isLangRTL;

  readonly isSmallMainContainer = computed(
    () => this._containerWidth() < SMALL_CONTAINER_WIDTH,
  );

  readonly isVerySmallMainContainer = computed(
    () => this._containerWidth() < VERY_SMALL_CONTAINER_WIDTH,
  );

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

  // Effect to set up resize observer when content element is available
  private _contentElEffect = effect(() => {
    const elRef = this.contentElRef();
    if (elRef) {
      this._setupResizeObserver(elRef.nativeElement);
    }
  });

  // Effects to handle class toggling
  private _containerClassEffect = effect(() => {
    const containerEl = this._elementRef.nativeElement;
    const isSmall = this.isSmallMainContainer();
    const isVerySmall = this.isVerySmallMainContainer();

    if (isSmall) {
      containerEl.classList.add(MainContainerClass.isSmallMainContainer);
    } else {
      containerEl.classList.remove(MainContainerClass.isSmallMainContainer);
    }

    if (isVerySmall) {
      containerEl.classList.add(MainContainerClass.isVerySmallMainContainer);
    } else {
      containerEl.classList.remove(MainContainerClass.isVerySmallMainContainer);
    }
  });

  ngOnDestroy(): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  updateStyleAfterTransition(): void {
    // Handle visibility after transition ends
    if (!this.isOver() && !this.isOpen()) {
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

  private _getWidthRelatedStyles(): string {
    const widthStyle = ` width: ${this.sideWidth()}%;`;
    const margin = this.isRTL() ? 'margin-left' : 'margin-right';
    const isOpen = this.isOpen();
    const isOver = this.isOver();

    return isOver
      ? isOpen
        ? 'transform: translateX(0);'
        : 'transform: translateX(100%);'
      : isOpen
        ? `${margin}: 0; ${widthStyle}`
        : `${margin}: ${-1 * this.sideWidth()}%; ${widthStyle}`;
  }

  private _setupResizeObserver(element: HTMLElement): void {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this._containerWidth.set(entry.contentRect.width);
      }
    });

    this._resizeObserver.observe(element);
  }

  protected readonly IS_TOUCH_PRIMARY = IS_TOUCH_PRIMARY;
}
