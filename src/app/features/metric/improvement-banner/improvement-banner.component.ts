import {ChangeDetectionStrategy, Component, OnDestroy} from '@angular/core';
import {Improvement} from '../improvement/improvement.model';
import {ImprovementService} from '../improvement/improvement.service';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {improvementBannerAnimation} from './improvement-banner.ani';
import {Subscription} from 'rxjs';

@Component({
  selector: 'improvement-banner',
  templateUrl: './improvement-banner.component.html',
  styleUrls: ['./improvement-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [improvementBannerAnimation]
})
export class ImprovementBannerComponent implements OnDestroy {
  improvements: Improvement[];

  private _subs = new Subscription();

  constructor(
    public improvementService: ImprovementService,
  ) {
    this._subs.add(this.improvementService.lastTrackedImprovementsTomorrow$.subscribe(val => this.improvements = val));
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  dismiss(improvement: Improvement) {
    this.improvementService.hideImprovement(improvement.id);
  }

  check(improvement: Improvement) {
    this.improvementService.addCheckedDay(improvement.id, getWorklogStr());
    this.improvementService.hideImprovement(improvement.id);
  }

  updateShowEveryDay(id: string, isShowEveryDay: boolean) {
    this.improvementService.updateImprovement(id, {isShowEveryDay});
  }
}
