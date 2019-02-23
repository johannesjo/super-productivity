import { Injectable } from '@angular/core';
import { Banner } from './banner.model';
import { Observable, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private _banners: Banner[] = [];
  private _banners$ = new ReplaySubject<Banner[]>();
  activeBanner$: Observable<Banner> = this._banners$.pipe(
    map((banners) => banners && banners.length && banners[0])
  );

  constructor() {
  }

  open(banner: Banner) {
    const bannerToUpdate = this._banners.find(banner_ => banner_.id === banner.id);
    if (bannerToUpdate) {
      Object.assign(bannerToUpdate, banner);
    } else {
      this._banners.push(banner);
    }
    this._banners$.next(this._banners);
  }

  dismiss(bannerId) {
    if (this._banners.find(banner_ => banner_.id === bannerId)) {
      this._banners.shift();
      this._banners$.next(this._banners);
    }
  }
}
