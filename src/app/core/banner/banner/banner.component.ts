import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BannerService } from '../banner.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { Banner, BannerAction } from '../banner.model';
import { concatMap, mapTo } from 'rxjs/operators';
import { merge, Observable, of, timer } from 'rxjs';

@Component({
  selector: 'banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class BannerComponent {
  // TODO maybe improve if initial delay is annoying
  activeBanner$: Observable<Banner> = this.bannerService.activeBanner$.pipe(
    concatMap((activeBanner) => {
      if (activeBanner) {
        return merge(
          of(null),
          timer(500).pipe(mapTo(activeBanner))
        );
      } else {
        return of(null);
      }
    })
  );

  constructor(
    public bannerService: BannerService,
  ) {
  }

  dismiss(bannerId) {
    this.bannerService.dismiss(bannerId);
  }

  action(bannerId: string, bannerAction: BannerAction) {
    this.dismiss(bannerId);
    bannerAction.fn();
  }
}
