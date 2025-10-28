import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { MetricCopy } from '../metric.model';
import { MetricService } from '../metric.service';
import {
  calculateProductivityScore,
  calculateSustainabilityScore,
  getScoreColorGradient,
  TrendIndicator,
} from '../metric-scoring.util';
import { ImprovementService } from '../improvement/improvement.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { T } from '../../../t.const';
import { DialogAddNoteComponent } from '../../note/dialog-add-note/dialog-add-note.component';
import { MatDialog } from '@angular/material/dialog';
import { WorkContextService } from '../../work-context/work-context.service';
import { DateService } from 'src/app/core/date/date.service';
import { HelpSectionComponent } from '../../../ui/help-section/help-section.component';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MsToClockStringPipe } from '../../../ui/duration/ms-to-clock-string.pipe';
import { InlineInputComponent } from '../../../ui/inline-input/inline-input.component';

@Component({
  selector: 'evaluation-sheet',
  templateUrl: './evaluation-sheet.component.html',
  styleUrls: ['./evaluation-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HelpSectionComponent,
    RouterLink,
    FormsModule,
    MatButton,
    MatIcon,
    MatRadioGroup,
    MatRadioButton,
    AsyncPipe,
    TranslatePipe,
    MsToClockStringPipe,
    InlineInputComponent,
  ],
})
export class EvaluationSheetComponent implements OnDestroy, OnInit {
  improvementService = inject(ImprovementService);
  workContextService = inject(WorkContextService);
  private _metricService = inject(MetricService);
  private _matDialog = inject(MatDialog);
  private _cd = inject(ChangeDetectorRef);
  private _dateService = inject(DateService);

  readonly save = output<any>();
  T: typeof T = T;
  metricForDay?: MetricCopy;
  private _timeWorkedToday: number | null = null;
  day$: BehaviorSubject<string> = new BehaviorSubject(this._dateService.todayStr());
  private _metricForDay$: Observable<MetricCopy> = this.day$.pipe(
    switchMap((day) =>
      this._metricService.getMetricForDayOrDefaultWithCheckedImprovements$(day),
    ),
  );
  // isForToday$: Observable<boolean> = this.day$.pipe(map(day => day === getWorklogStr()));
  private _subs: Subscription = new Subscription();

  // 7-day average and trend
  sevenDayAverage$: Observable<number | null> =
    this._metricService.getAverageProductivityScore$(7);
  productivityTrend$: Observable<TrendIndicator | null> =
    this._metricService.getProductivityTrend$(7);

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set day(val: string) {
    this.day$.next(val);
  }

  @Input() set timeWorkedToday(val: number | null) {
    this._timeWorkedToday = val;
    // Pre-fill total work time if not already set
    if (
      val &&
      this.metricForDay &&
      (!this.metricForDay.totalWorkMinutes || this.metricForDay.totalWorkMinutes === 0)
    ) {
      const totalWorkMinutes = val / (1000 * 60);
      this._update({ totalWorkMinutes });
    }
  }

  ngOnInit(): void {
    this._subs.add(
      this._metricForDay$.subscribe((metric) => {
        this.metricForDay = metric;
        // Pre-fill total work time if not already set and we have time worked data
        if (
          this._timeWorkedToday &&
          (!metric.totalWorkMinutes || metric.totalWorkMinutes === 0)
        ) {
          const totalWorkMinutes = this._timeWorkedToday / (1000 * 60);
          this.metricForDay = {
            ...metric,
            totalWorkMinutes,
          };
          this._metricService.upsertMetric(this.metricForDay as MetricCopy);
        }
        this._cd.detectChanges();
      }),
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  updateImpactOfWork(impactOfWork: number): void {
    this._update({ impactOfWork });
  }

  updateDeepWorkTime(milliseconds: number): void {
    // Replace focusSessions with a single manual entry
    this._update({ focusSessions: [milliseconds] });
  }

  updateEnergyCheckin(energyCheckin: number): void {
    this._update({ energyCheckin });
  }

  updateTotalWorkMinutes(milliseconds: number): void {
    // Convert from milliseconds to minutes for storage
    const totalWorkMinutes = milliseconds / (1000 * 60);
    this._update({ totalWorkMinutes });
  }

  get totalWorkTimeMs(): number {
    return (this.metricForDay?.totalWorkMinutes ?? 0) * 60 * 1000;
  }

  get deepWorkTime(): number {
    const focusSessions = this.metricForDay?.focusSessions ?? [];
    return focusSessions.reduce((acc, val) => acc + val, 0);
  }

  get deepWorkMinutes(): number {
    return this.deepWorkTime / (1000 * 60);
  }

  get productivityScore(): number {
    const impactRating = this.metricForDay?.impactOfWork ?? 3; // Default to neutral (3) if not set
    const focusedMinutes = this.deepWorkMinutes;
    const totalWorkMinutes =
      this.metricForDay?.totalWorkMinutes ?? Math.max(focusedMinutes, 1);
    const targetFocusedMinutes = this.metricForDay?.targetMinutes ?? 240;
    const completedTasks = this.metricForDay?.completedTasks ?? undefined;
    const plannedTasks = this.metricForDay?.plannedTasks ?? undefined;

    return calculateProductivityScore(
      impactRating,
      focusedMinutes,
      totalWorkMinutes,
      targetFocusedMinutes,
      completedTasks,
      plannedTasks,
    );
  }

  get sustainabilityScore(): number {
    const focusedMinutes = this.deepWorkMinutes;
    const totalWorkMinutes =
      this.metricForDay?.totalWorkMinutes ?? Math.max(focusedMinutes, 1);
    const energyCheckin = this.metricForDay?.energyCheckin ?? undefined;

    return calculateSustainabilityScore(
      focusedMinutes,
      totalWorkMinutes,
      600, // workloadLinearZeroAt: 10h → score 0
      energyCheckin,
    );
  }

  getScoreColor(score: number): string {
    return getScoreColorGradient(score);
  }

  addObstruction(v: string): void {
    this._update({
      obstructions: [...(this.metricForDay as MetricCopy).obstructions, v],
    });
  }

  addImprovement(v: string): void {
    this._update({
      improvements: [...(this.metricForDay as MetricCopy).improvements, v],
    });
  }

  toggleImprovementRepeat(improvementId: string): void {
    this.improvementService.toggleImprovementRepeat(improvementId);
  }

  addNote(): void {
    this._matDialog.open(DialogAddNoteComponent, {
      minWidth: '100vw',
      height: '100vh',
      restoreFocus: true,
    });
  }

  private _update(updateData: Partial<MetricCopy>): void {
    this.metricForDay = {
      ...(this.metricForDay as MetricCopy),
      ...updateData,
    } as MetricCopy;
    this._metricService.upsertMetric(this.metricForDay as MetricCopy);
    this._cd.markForCheck();
  }
}
