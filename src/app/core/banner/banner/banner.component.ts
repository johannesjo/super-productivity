import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { BannerService } from '../banner.service';
import { Banner, BannerAction, BannerId } from '../banner.model';
import { concatMap, mapTo } from 'rxjs/operators';
import { merge, Observable, of, timer } from 'rxjs';
import { slideAnimation } from '../../../ui/animations/slide.ani';
import { T } from '../../../t.const';

@Component({
  selector: 'banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slideAnimation]
})
export class BannerComponent {
  T: typeof T = T;
  height: number = 120;
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
    private _elementRef: ElementRef,
  ) {
  }

  @ViewChild('wrapperEl') set wrapperEl(content: ElementRef) {
    if (content && content.nativeElement) {
      this.height = content.nativeElement.offsetHeight;
    }
  }

  dismiss(bannerId: string) {
    this._updateHeight();
    this.bannerService.dismiss(bannerId as BannerId);
  }

  action(bannerId: string, bannerAction: BannerAction) {
    this._updateHeight();
    this.dismiss(bannerId);
    bannerAction.fn();
  }

  private _updateHeight() {
    this.height = this._elementRef.nativeElement.offsetHeight;
  }
}
