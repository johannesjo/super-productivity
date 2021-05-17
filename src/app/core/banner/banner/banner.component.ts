import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BannerService } from '../banner.service';
import { Banner, BannerAction, BannerId } from '../banner.model';
import { concatMap, mapTo } from 'rxjs/operators';
import { merge, Observable, of, timer } from 'rxjs';
import { T } from '../../../t.const';
import { bannerAnimation } from './banner.ani';

@Component({
  selector: 'banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [bannerAnimation],
})
export class BannerComponent {
  T: typeof T = T;
  private _dirtyReference?: string | null;
  // TODO maybe improve if initial delay is annoying
  activeBanner$: Observable<Banner | null> = this.bannerService.activeBanner$.pipe(
    concatMap((activeBanner) => {
      if (activeBanner) {
        if (!this._dirtyReference || this._dirtyReference === activeBanner.id) {
          this._dirtyReference = activeBanner.id;
          return of(activeBanner);
        }

        this._dirtyReference = activeBanner.id;
        return merge(of(null), timer(500).pipe(mapTo(activeBanner)));
      } else {
        this._dirtyReference = null;
        return of(null);
      }
    }),
  );

  constructor(public bannerService: BannerService) {}

  dismiss(bannerId: string) {
    this.bannerService.dismiss(bannerId as BannerId);
  }

  action(bannerId: string, bannerAction: BannerAction) {
    this.dismiss(bannerId);
    bannerAction.fn();
  }
}
