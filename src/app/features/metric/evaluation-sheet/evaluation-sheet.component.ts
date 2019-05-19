import {ChangeDetectionStrategy, Component} from '@angular/core';
import {DEFAULT_METRIC_FOR_DAY} from '../metric.const';
import {MetricCopy} from '../metric.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {MetricService} from '../metric.service';
import {ObstructionService} from '../obstruction/obstruction.service';

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

  constructor(
    private _metricService: MetricService,
    public obstructionService: ObstructionService,
  ) {
    this.metricForDay = {
      id: getWorklogStr(),
      ...DEFAULT_METRIC_FOR_DAY,
    };
  }

  addObstruction(v: string) {
    this.metricForDay.obstructions = [...this.metricForDay.obstructions, v];
  }

  addNewObstruction(v: string) {
    const id = this.obstructionService.addObstruction(v);
    this.metricForDay.obstructions = [...this.metricForDay.obstructions, id];
  }

  removeObstruction(idToRemove: string) {
    this.metricForDay.obstructions = this.metricForDay.obstructions.filter(id => id !== idToRemove);
  }

  submit() {
    console.log('SUBMIT');
    this._metricService.upsertMetric(this.metricForDay);
  }


}
