import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  description: string | null;
  alt_description: string | null;
  user: {
    name: string;
  };
}

export interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root',
})
export class UnsplashService {
  private readonly API_URL = 'https://api.unsplash.com';
  // You need to register your app at https://unsplash.com/developers
  // and get a free API key (50 requests/hour for demo apps)
  // Replace this with your actual Unsplash Access Key
  private readonly ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY';

  constructor(private _http: HttpClient) {}

  searchPhotos(query: string, page = 1): Observable<UnsplashSearchResponse> {
    if (!query || query.trim() === '') {
      return of({ results: [], total: 0, total_pages: 0 });
    }

    const params = {
      query: query.trim(),
      page: page.toString(),
      per_page: '20',
      orientation: 'landscape',
    };

    return this._http
      .get<UnsplashSearchResponse>(`${this.API_URL}/search/photos`, {
        params,
        headers: {
          Authorization: `Client-ID ${this.ACCESS_KEY}`,
        },
      })
      .pipe(
        catchError((error) => {
          console.error('Unsplash API error:', error);
          return of({ results: [], total: 0, total_pages: 0 });
        }),
      );
  }

  getPhotoUrl(
    photo: UnsplashPhoto,
    size: 'thumb' | 'small' | 'regular' = 'regular',
  ): string {
    return photo.urls[size];
  }
}
