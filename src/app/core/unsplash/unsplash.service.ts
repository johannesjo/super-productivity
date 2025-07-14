import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getEnv } from '../../util/env';

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
  private readonly ACCESS_KEY = getEnv('UNSPLASH_KEY');
  private readonly CLIENT_ID = getEnv('UNSPLASH_CLIENT_ID');

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

    const url = `${this.API_URL}/search/photos`;
    // Try ACCESS_KEY first, fall back to CLIENT_ID if not available
    const authKey = this.ACCESS_KEY || this.CLIENT_ID;
    const headers = {
      Authorization: `Client-ID ${authKey}`,
    };

    return this._http
      .get<UnsplashSearchResponse>(url, {
        params,
        headers,
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

  /**
   * Get a custom resolution image URL using Unsplash's dynamic image API
   * @param photo - The Unsplash photo object
   * @param width - Desired width in pixels (max 2400 for free tier)
   * @param options - Additional options like quality, format, dpr
   * @returns URL string with custom parameters
   */
  getCustomPhotoUrl(
    photo: UnsplashPhoto,
    width: number,
    options: {
      quality?: number; // 1-100
      format?: 'jpg' | 'webp' | 'avif' | 'auto';
      dpr?: number; // Device pixel ratio 1-2
      fit?:
        | 'clamp'
        | 'clip'
        | 'crop'
        | 'facearea'
        | 'fill'
        | 'fillmax'
        | 'max'
        | 'min'
        | 'scale';
    } = {},
  ): string {
    const { quality = 80, format = 'auto', dpr = 1, fit } = options;
    let url = `${photo.urls.raw}&w=${width}&q=${quality}&auto=${format}&dpr=${dpr}`;
    if (fit) {
      url += `&fit=${fit}`;
    }
    return url;
  }
}
