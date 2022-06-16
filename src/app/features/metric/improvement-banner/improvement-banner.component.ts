import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { Improvement } from '../improvement/improvement.model';
import { ImprovementService } from '../improvement/improvement.service';
import { improvementBannerAnimation } from './improvement-banner.ani';
import { Subscription } from 'rxjs';
import { T } from '../../../t.const';
import { DateService } from 'src/app/core/date/date.service';

@Component({
  selector: 'improvement-banner',
  templateUrl: './improvement-banner.component.html',
  styleUrls: ['./improvement-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [improvementBannerAnimation],
})
export class ImprovementBannerComponent implements OnDestroy {
  T: typeof T = T;
  improvements: Improvement[] = [];

  private _subs: Subscription = new Subscription();

  constructor(
    public improvementService: ImprovementService,
    private _dateService: DateService,
  ) {
    this._subs.add(
      this.improvementService.improvementBannerImprovements$.subscribe(
        (val) => (this.improvements = val || []),
      ),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  dismiss(improvement: Improvement): void {
    this.improvementService.hideImprovement(improvement.id);
  }

  check(improvement: Improvement): void {
    this.improvementService.addCheckedDay(improvement.id, this._dateService.todayStr());
    this.improvementService.hideImprovement(improvement.id);
  }

  trackById(i: number, improvement: Improvement): string {
    return improvement.id;
  }
}
