import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { Improvement } from '../improvement/improvement.model';
import { ImprovementService } from '../improvement/improvement.service';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { improvementBannerAnimation } from './improvement-banner.ani';
import { Subscription } from 'rxjs';
import { T } from '../../../t.const';

@Component({
  selector: 'improvement-banner',
  templateUrl: './improvement-banner.component.html',
  styleUrls: ['./improvement-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [improvementBannerAnimation]
})
export class ImprovementBannerComponent implements OnDestroy {
  T: typeof T = T;
  improvements: Improvement[] = [];

  private _subs: Subscription = new Subscription();

  constructor(
    public improvementService: ImprovementService,
  ) {
    this._subs.add(this.improvementService.improvementBannerImprovements$.subscribe(val => this.improvements = val || []));
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

  trackById(i: number, improvement: Improvement): string {
    return improvement.id;
  }

}
