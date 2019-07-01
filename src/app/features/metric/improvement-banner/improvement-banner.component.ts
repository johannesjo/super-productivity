import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Improvement} from '../improvement/improvement.model';
import {ImprovementService} from '../improvement/improvement.service';

@Component({
  selector: 'improvement-banner',
  templateUrl: './improvement-banner.component.html',
  styleUrls: ['./improvement-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImprovementBannerComponent {


  constructor(
    public improvementService: ImprovementService,
  ) {
  }

  remove(improvement: Improvement) {
    // TODO simplify save hidden indexes to session storage
    this.improvementService.hideImprovement(improvement.id);
  }

}
