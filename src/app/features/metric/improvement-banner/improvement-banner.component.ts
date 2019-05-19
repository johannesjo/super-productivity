import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MetricService} from '../metric.service';
import {Improvement} from '../improvement/improvement.model';

@Component({
  selector: 'improvement-banner',
  templateUrl: './improvement-banner.component.html',
  styleUrls: ['./improvement-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImprovementBannerComponent {


  constructor(
    public metricService: MetricService,
  ) {
  }

  remove(improvement: Improvement) {
    // TODO simplify save hidden indexes to session storage
    // this.improvementSuggestions.splice(this.improvementSuggestions.indexOf(suggestion), 1);
  }

}
