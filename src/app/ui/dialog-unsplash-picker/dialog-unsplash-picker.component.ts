import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
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
  showApiKeyNotice = computed(
    () => !this.isLoading() && this.photos().length === 0 && !this.searchQuery(),
  );

  private _searchSubject = new Subject<string>();
  private _destroy$ = new Subject<void>();
  private _globalThemeService = inject(GlobalThemeService);

  constructor(
    private _dialogRef: MatDialogRef<DialogUnsplashPickerComponent>,
    private _unsplashService: UnsplashService,
  ) {}

  ngOnInit(): void {
    this._searchSubject
      .pipe(
        debounceTime(1000), // Increased to 1 second to reduce API calls (50 req/hour limit)
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query || query.trim() === '') {
            // Use 'night' as default for dark theme, 'nature landscape' for light theme
            return this._globalThemeService.isDarkTheme$.pipe(
              take(1),
              switchMap((isDark) => {
                const defaultQuery = isDark ? 'night' : 'nature landscape';
                return this._unsplashService.searchPhotos(defaultQuery);
              }),
            );
          }
          this.isLoading.set(true);
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

    // Initial search for background images based on theme
    this._globalThemeService.isDarkTheme$.pipe(take(1)).subscribe((isDark) => {
      this.onSearchChange(isDark ? 'night' : 'nature landscape');
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
    // Return the regular size URL for better quality
    this._dialogRef.close(photo.urls.regular);
  }

  getPhotoThumb(photo: UnsplashPhoto): string {
    return this._unsplashService.getPhotoUrl(photo, 'small');
  }
}
