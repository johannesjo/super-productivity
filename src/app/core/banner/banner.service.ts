import { Injectable } from '@angular/core';
import { Banner, BannerId } from './banner.model';
import { Observable, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({providedIn: 'root'})
export class BannerService {
  private _banners: Banner[] = [];
  private _banners$: ReplaySubject<Banner[]> = new ReplaySubject(1);
  activeBanner$: Observable<Banner | null> = this._banners$.pipe(
    map((banners) => (banners && banners.length && banners[0]) || null)
  );

  constructor() {
    // FOR DEBUGGING
    // this.open({
    //   id: 'JIRA_UNBLOCK',
    //   msg: 'Jira: To prevent shut out from api, access has been blocked by Super Productivity. You probably should check your jira settings!',
    //   svgIco: 'jira',
    //   action: {
    //     label: 'Unblock',
    //     fn: () => {
    //     }
    //   }
    // });
    //
    // this.open({
    //   id: 'TAKE_A_BREAK',
    //   ico: 'free_breakfast',
    //   msg: 'You should take a break',
    //   action: {
    //     label: 'I already did',
    //     fn: () => {
    //     }
    //   },
    //   action2: {
    //     label: 'Snooze 15m',
    //     fn: () => {
    //     }
    //   },
    // });
    //
    // this.open({
    //   msg: 'GoogleApi: Failed to authenticate please try logging in again!',
    //   ico: 'cloud_off',
    //   id: 'GOOGLE_LOGIN',
    //   action: {
    //     label: 'Login',
    //     fn: () => {
    //     }
    //   }
    // });
    //
    // this.open({
    //   id: 'GLOBAL_ERROR',
    //   type: 'ERROR',
    //   ico: 'error',
    //   msg: 'ERROR: ' + 'Something broke',
    //   action: {
    //     label: 'Report',
    //     fn: () => window.open('https://github.com/johannesjo/super-productivity/issues/new'),
    //   },
    //   action2: {
    //     label: 'Reload App',
    //     fn: () => window.location.reload()
    //   },
    //   action3: {
    //     label: 'Dismiss',
    //     fn: () => {
    //     }
    //   }
    // });
  }

  open(banner: Banner) {
    const bannerToUpdate = this._banners.find(bannerIN => bannerIN.id === banner.id);
    if (bannerToUpdate) {
      Object.assign(bannerToUpdate, banner);
    } else {
      this._banners.push(banner);
    }
    this._banners$.next(this._banners);
  }

  dismiss(bannerId: BannerId) {
    if (this._banners.find(bannerIN => bannerIN.id === bannerId)) {
      this._banners.shift();
      this._banners$.next(this._banners);
    }
  }

  dismissIfExisting(bannerId: BannerId) {
    if (this._banners.find(bannerIN => bannerIN.id === bannerId)) {
      this._banners.shift();
      this._banners$.next(this._banners);
    }
  }
}
