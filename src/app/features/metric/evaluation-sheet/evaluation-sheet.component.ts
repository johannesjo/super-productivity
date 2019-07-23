import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import {DEFAULT_METRIC_FOR_DAY} from '../metric.const';
import {MetricCopy} from '../metric.model';
import {MetricService} from '../metric.service';
import {ObstructionService} from '../obstruction/obstruction.service';
import {ImprovementService} from '../improvement/improvement.service';
import {BehaviorSubject, combineLatest, Subscription} from 'rxjs';
import {NoteService} from '../../note/note.service';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {filter, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {ProjectService} from '../../project/project.service';
import {T} from '../../../t.const';

@Component({
  selector: 'evaluation-sheet',
  templateUrl: './evaluation-sheet.component.html',
  styleUrls: ['./evaluation-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvaluationSheetComponent implements OnDestroy, OnInit {
  @Input() set day(val: string) {
    this.day$.next(val);
  }

  @Output() save = new EventEmitter<any>();

  T = T;
  tomorrowsNote: string;
  metricForDay: MetricCopy;

  day$ = new BehaviorSubject<string>(getWorklogStr());
  // isForToday$: Observable<boolean> = this.day$.pipe(map(day => day === getWorklogStr()));

  private _metricForDay$ = combineLatest(
    this.day$,
    this._projectService.isRelatedDataLoadedForCurrentProject$,
  ).pipe(
    filter(([day, isLoaded]) => isLoaded),
    switchMap(([day]) => this._metricService.getMetricForDay$(day)),
    withLatestFrom(this.day$),
    map(([metric, day]) => {
      return metric || {
        id: day,
        ...DEFAULT_METRIC_FOR_DAY,
      };
    })
  );
  private _subs = new Subscription();


  constructor(
    public obstructionService: ObstructionService,
    public improvementService: ImprovementService,
    private _metricService: MetricService,
    private _projectService: ProjectService,
    private _noteService: NoteService,
    private _cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit(): void {
    this._subs.add(this._metricForDay$.subscribe(metric => {
      this.metricForDay = metric;
      this._cd.detectChanges();
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

    this._metricService.upsertMetric(this.metricForDay);
    this.save.emit();
  }
}
