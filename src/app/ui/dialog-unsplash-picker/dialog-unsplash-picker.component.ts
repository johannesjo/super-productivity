import { ChangeDetectionStrategy, Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { UnsplashService, UnsplashPhoto } from '../../core/unsplash/unsplash.service';

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
  searchQuery = '';
  photos: UnsplashPhoto[] = [];
  isLoading = false;

  private _searchSubject = new Subject<string>();
  private _destroy$ = new Subject<void>();

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
            return this._unsplashService.searchPhotos('nature landscape');
          }
          this.isLoading = true;
          return this._unsplashService.searchPhotos(query);
        }),
        takeUntil(this._destroy$),
      )
      .subscribe({
        next: (response) => {
          this.photos = response.results;
          this.isLoading = false;
        },
        error: () => {
          this.photos = [];
          this.isLoading = false;
        },
      });

    // Initial search for background images
    this.onSearchChange('nature landscape');
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onSearchChange(query: string): void {
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
