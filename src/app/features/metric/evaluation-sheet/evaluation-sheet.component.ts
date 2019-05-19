import {ChangeDetectionStrategy, Component} from '@angular/core';
import {DEFAULT_METRIC_FOR_DAY} from '../metric.const';
import {MetricCopy} from '../metric.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {MetricService} from '../metric.service';

@Component({
  selector: 'evaluation-sheet',
  templateUrl: './evaluation-sheet.component.html',
  styleUrls: ['./evaluation-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationSheetComponent {
  metricForDay: MetricCopy;

  obstructionSuggestions = [
    {id: 'XX', title: 'Some XXX'},
    {id: 'DD', title: 'Some other DD'},
  ];

  constructor(private _metricService: MetricService) {
    this.metricForDay = {
      id: getWorklogStr(),
      ...DEFAULT_METRIC_FOR_DAY,
    };
  }

  addObstruction(v: string) {
    this.metricForDay.obstructions = [...this.metricForDay.obstructions, v];
  }

  addNewObstruction(v: string) {
    // TODO wait for id here
    // this.metricForDay.obstructions.push(v);
    console.log('addNewObstruction', v);
  }

  removeObstruction(idToRemove: string) {
    this.metricForDay.obstructions = this.metricForDay.obstructions.filter(id => id !== idToRemove);
  }

  submit() {
    console.log('SUBMIT');
    this._metricService.upsertMetric(this.metricForDay);
  }


}
