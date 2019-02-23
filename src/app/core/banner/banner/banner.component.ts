import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BannerService } from '../banner.service';
import { expandAnimation } from '../../../ui/animations/expand.ani';
import { BannerAction } from '../banner.model';

@Component({
  selector: 'banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [expandAnimation]
})
export class BannerComponent {
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
