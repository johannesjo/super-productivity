import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {DEFAULT_METRIC_FOR_DAY} from '../metric.const';
import {MetricCopy} from '../metric.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {MetricService} from '../metric.service';
import {ObstructionService} from '../obstruction/obstruction.service';
import {ImprovementService} from '../improvement/improvement.service';
import {Subscription} from 'rxjs';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {NoteService} from '../../note/note.service';

@Component({
  selector: 'evaluation-sheet',
  templateUrl: './evaluation-sheet.component.html',
  styleUrls: ['./evaluation-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationSheetComponent implements OnDestroy, OnInit {
  metricForDay: MetricCopy;
  form: FormGroup;
  moodFormCtrl = new FormControl('', [
    Validators.required,
    Validators.min(1),
    Validators.max(10),
  ]);
  productivityFormCtrl = new FormControl('', [
    Validators.required,
    Validators.min(1),
    Validators.max(10),
  ]);
  notesCtrl = new FormControl('', []);
  tomorrowsNote: string;

  private _subs = new Subscription();

  constructor(
    public obstructionService: ObstructionService,
    public improvementService: ImprovementService,
    private _metricService: MetricService,
    private _noteService: NoteService,
    private _cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    this.metricForDay = {
      id: getWorklogStr(),
      ...DEFAULT_METRIC_FOR_DAY,
    };

    this.form = new FormGroup({
      mood: this.moodFormCtrl,
      productivity: this.productivityFormCtrl,
      notes: this.notesCtrl,
      // obstructions: new FormControl(this.metricForDay.obstructions),
      // improvements: new FormControl(this.metricForDay.improvements),
      // improvementsTomorrow: new FormControl(this.metricForDay.improvementsTomorrow),
    });

    this._subs.add(this._metricService.getTodaysMetric().subscribe(metric => {
      if (metric) {
        this.metricForDay = metric;
        this._cd.detectChanges();
      }
    }));
  }


  ngOnDestroy(): void {
    this._subs.unsubscribe();
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
    if (this.tomorrowsNote && this.tomorrowsNote.trim().length > 0) {
      const date = new Date();
      // tomorrow at 10 o'clock
      date.setHours(10, 0, 0, 0);
      date.setDate(date.getDate() + 1);
      this._noteService.add({
        content: this.tomorrowsNote,
      }, date.getTime());
    }

    if (this.form.valid) {
      this._metricService.upsertMetric(this.metricForDay);
    }
  }
}
