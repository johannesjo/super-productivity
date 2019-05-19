import {ChangeDetectionStrategy, Component} from '@angular/core';
import {DEFAULT_METRIC_FOR_DAY} from '../metric.const';
import {MetricCopy} from '../metric.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {MetricService} from '../metric.service';
import {ObstructionService} from '../obstruction/obstruction.service';
import {ImprovementService} from '../improvement/improvement.service';

@Component({
  selector: 'evaluation-sheet',
  templateUrl: './evaluation-sheet.component.html',
  styleUrls: ['./evaluation-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationSheetComponent {
  metricForDay: MetricCopy;

  constructor(
    private _metricService: MetricService,
    public obstructionService: ObstructionService,
    public improvementService: ImprovementService,
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


  addImprovement(v: string) {
    this.metricForDay.improvements = [...this.metricForDay.improvements, v];
  }

  addNewImprovement(v: string) {
    const id = this.improvementService.addImprovement(v);
    this.metricForDay.improvements = [...this.metricForDay.improvements, id];
  }

  removeImprovement(idToRemove: string) {
    this.metricForDay.improvements = this.metricForDay.improvements.filter(id => id !== idToRemove);
  }


  addImprovementTomorrow(v: string) {
    this.metricForDay.improvementsTomorrow = [...this.metricForDay.improvementsTomorrow, v];
  }

  addNewImprovementTomorrow(v: string) {
    const id = this.improvementService.addImprovement(v);
    this.metricForDay.improvementsTomorrow = [...this.metricForDay.improvementsTomorrow, id];
  }

  removeImprovementTomorrow(idToRemove: string) {
    this.metricForDay.improvementsTomorrow = this.metricForDay.improvementsTomorrow.filter(id => id !== idToRemove);
  }

  submit() {
    this._metricService.upsertMetric(this.metricForDay);
  }
}
