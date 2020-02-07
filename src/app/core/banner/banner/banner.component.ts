import {ChangeDetectionStrategy, Component, ElementRef, ViewChild} from '@angular/core';
import {BannerService} from '../banner.service';
import {Banner, BannerAction} from '../banner.model';
import {concatMap, mapTo} from 'rxjs/operators';
import {merge, Observable, of, timer} from 'rxjs';
import {slideAnimation} from '../../../ui/animations/slide.ani';
import {T} from '../../../t.const';

@Component({
  selector: 'banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideAnimation]
})
export class BannerComponent {
  T = T;
  height = 120;
  private _dirtyReference: string;
  // TODO maybe improve if initial delay is annoying
  activeBanner$: Observable<Banner> = this.bannerService.activeBanner$.pipe(
    concatMap((activeBanner) => {
      if (activeBanner) {
        if (!this._dirtyReference || this._dirtyReference === activeBanner.id) {
          this._dirtyReference = activeBanner.id;
          return of(activeBanner);
        }

        this._dirtyReference = activeBanner.id;
        return merge(
          of(null),
          timer(500).pipe(mapTo(activeBanner))
        );
      } else {
        this._dirtyReference = null;
        return of(null);
      }
    })
  );

  constructor(
    public bannerService: BannerService,
  ) {
  }

  @ViewChild('wrapperEl') set wrapperEl(content: ElementRef) {
    if (content && content.nativeElement) {
      this.height = content.nativeElement.offsetHeight;
    }
  }

  dismiss(bannerId) {
    this.bannerService.dismiss(bannerId);
  }

  action(bannerId: string, bannerAction: BannerAction) {
    this.dismiss(bannerId);
    bannerAction.fn();
  }
}
