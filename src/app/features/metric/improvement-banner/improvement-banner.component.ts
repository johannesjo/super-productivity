import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Improvement} from '../improvement/improvement.model';
import {ImprovementService} from '../improvement/improvement.service';
import {getWorklogStr} from '../../../util/get-work-log-str';

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

  dismiss(improvement: Improvement) {
    this.improvementService.hideImprovement(improvement.id);
  }

  check(improvement: Improvement) {
    this.improvementService.addCheckedDay(improvement.id, getWorklogStr());
    this.improvementService.hideImprovement(improvement.id);
  }
}
