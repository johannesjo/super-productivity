import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import {
  MatDialogRef,
  MatDialogContent,
  MatDialogTitle,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
  take,
} from 'rxjs/operators';
import { UnsplashService, UnsplashPhoto } from '../../core/unsplash/unsplash.service';
import { GlobalThemeService } from '../../core/theme/global-theme.service';

export interface DialogUnsplashPickerData {
  context?:
    | 'backgroundImageDark'
    | 'backgroundImageLight'
    | 'taskBackground'
    | 'projectIcon'
    | string;
}

@Component({
  selector: 'dialog-unsplash-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatLabel,
    MatInput,
    MatProgressSpinner,
  ],
  templateUrl: './dialog-unsplash-picker.component.html',
  styleUrls: ['./dialog-unsplash-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogUnsplashPickerComponent implements OnInit, OnDestroy {
  searchQuery = signal('');
  photos = signal<UnsplashPhoto[]>([]);
  isLoading = signal(false);

  // Computed signal for showing no results message
  showNoResults = computed(
    () => !this.isLoading() && this.photos().length === 0 && this.searchQuery(),
  );

  private _searchSubject = new Subject<string>();
  private _destroy$ = new Subject<void>();
  private _globalThemeService = inject(GlobalThemeService);
  public data: DialogUnsplashPickerData =
    inject(MAT_DIALOG_DATA, { optional: true }) || {};

  constructor(
    private _dialogRef: MatDialogRef<DialogUnsplashPickerComponent>,
    private _unsplashService: UnsplashService,
  ) {}

  private getDefaultSearchQuery(isDark: boolean): string {
    const context = this.data.context;

    // Simplified, more focused default searches
    switch (context) {
      case 'backgroundImageDark':
        return 'dark abstract gradient';
      case 'backgroundImageLight':
        return 'minimal landscape';
      case 'taskBackground':
        return 'texture pattern';
      case 'projectIcon':
        return 'minimal abstract';
      default:
        return isDark ? 'dark abstract' : 'minimal nature';
    }
  }

  ngOnInit(): void {
    // Setup search subscription
    this._searchSubject
      .pipe(
        debounceTime(800), // Balance between responsiveness and API limits
        distinctUntilChanged(),
        switchMap((query) => {
          this.isLoading.set(true);
          // If empty query, use context-aware default
          if (!query.trim()) {
            return this._globalThemeService.isDarkTheme$.pipe(
              take(1),
              switchMap((isDark) => {
                const defaultQuery = this.getDefaultSearchQuery(isDark);
                return this._unsplashService.searchPhotos(defaultQuery);
              }),
            );
          }
          return this._unsplashService.searchPhotos(query);
        }),
        takeUntil(this._destroy$),
      )
      .subscribe({
        next: (response) => {
          this.photos.set(response.results);
          this.isLoading.set(false);
        },
        error: () => {
          this.photos.set([]);
          this.isLoading.set(false);
        },
      });

    // Initial load with context-aware defaults
    this._globalThemeService.isDarkTheme$.pipe(take(1)).subscribe((isDark) => {
      this.onSearchChange(this.getDefaultSearchQuery(isDark));
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this._searchSubject.next(query);
  }

  selectPhoto(photo: UnsplashPhoto): void {
    // Use optimized background image URL
    const backgroundUrl = this._unsplashService.getBackgroundImageUrl(photo);
    this._dialogRef.close(backgroundUrl);
  }

  getPhotoThumb(photo: UnsplashPhoto): string {
    return this._unsplashService.getPhotoUrl(photo, 'small');
  }
}
