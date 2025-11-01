import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { UnsplashPhoto, UnsplashService } from '../../core/unsplash/unsplash.service';
import { GlobalThemeService } from '../../core/theme/global-theme.service';
import { TranslateModule } from '@ngx-translate/core';
import { T } from '../../t.const';

@Component({
  selector: 'dialog-unsplash-picker',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatLabel,
    MatInput,
    MatProgressSpinner,
    TranslateModule,
  ],
  templateUrl: './dialog-unsplash-picker.component.html',
  styleUrls: ['./dialog-unsplash-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogUnsplashPickerComponent implements OnInit, OnDestroy {
  private _dialogRef = inject<MatDialogRef<DialogUnsplashPickerComponent>>(MatDialogRef);
  private _unsplashService = inject(UnsplashService);
  private _globalThemeService = inject(GlobalThemeService);

  readonly T = T;
  searchQuery = signal('');
  photos = signal<UnsplashPhoto[]>([]);
  isLoading = signal(false);

  // Computed signal for showing no results message
  showNoResults = computed(
    () => !this.isLoading() && this.photos().length === 0 && this.searchQuery(),
  );

  private _searchSubject = new Subject<string>();
  private _destroy$ = new Subject<void>();

  private getDefaultSearchQuery(): string {
    const isDarkMode = this._globalThemeService.isDarkTheme();

    // Simplified, more focused default searches
    return isDarkMode ? 'night' : 'landscape';
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
            const defaultQuery = this.getDefaultSearchQuery();
            return this._unsplashService.searchPhotos(defaultQuery);
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

    this.onSearchChange(this.getDefaultSearchQuery());
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
    // Track download as required by Unsplash API guidelines
    this._unsplashService.trackPhotoDownload(photo).subscribe(() => {
      // After tracking, return the optimized background image URL
      const backgroundUrl = this._unsplashService.getBackgroundImageUrl(photo);

      // Include attribution data with the URL for potential future use
      this._dialogRef.close({
        url: backgroundUrl,
        attribution: {
          photographerName: photo.user.name,
          photographerUrl: photo.user.links?.html
            ? this._unsplashService.addUtmParams(photo.user.links.html)
            : undefined,
          photoUrl: photo.links?.html
            ? this._unsplashService.addUtmParams(photo.links.html)
            : undefined,
        },
      });
    });
  }

  getPhotoThumb(photo: UnsplashPhoto): string {
    return this._unsplashService.getPhotoUrl(photo, 'small');
  }

  getPhotographerUrl(photo: UnsplashPhoto): string {
    return photo.user.links?.html
      ? this._unsplashService.addUtmParams(photo.user.links.html)
      : '#';
  }
}
