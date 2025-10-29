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
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map as rxMap, switchMap } from 'rxjs/operators';
import { T } from '../../../t.const';
import { DialogAddNoteComponent } from '../../note/dialog-add-note/dialog-add-note.component';
import { MatDialog } from '@angular/material/dialog';
import { WorkContextService } from '../../work-context/work-context.service';
import { DateService } from 'src/app/core/date/date.service';
import { HelpSectionComponent } from '../../../ui/help-section/help-section.component';
import { DialogProductivityBreakdownComponent } from '../dialog-productivity-breakdown/dialog-productivity-breakdown.component';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatTooltip } from '@angular/material/tooltip';
import { AsyncPipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MsToClockStringPipe } from '../../../ui/duration/ms-to-clock-string.pipe';
import { DailyStateInfo, getDailyStateInfo } from '../utils/get-daily-state-info.util';
import { ImpactStarsComponent } from '../impact-stars/impact-stars.component';

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
    MatTooltip,
    AsyncPipe,
    NgClass,
    TranslatePipe,
    MsToClockStringPipe,
    ImpactStarsComponent,
  ],
})
export class EvaluationSheetComponent implements OnDestroy, OnInit {
  improvementService = inject(ImprovementService);
  workContextService = inject(WorkContextService);
  private _metricService = inject(MetricService);
  private _matDialog = inject(MatDialog);
  private _cd = inject(ChangeDetectorRef);
  private _dateService = inject(DateService);
  private _currentDay: string = this._dateService.todayStr();

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

  // Scores & trends
  sevenDayAverage$: Observable<number | null> =
    this._metricService.getAverageProductivityScore$(7);
  productivityTrend$: Observable<TrendIndicator | null> =
    this._metricService.getProductivityTrend$(7);
  productivitySummary$: Observable<{
    average: number | null;
    trend: TrendIndicator | null;
  }> = combineLatest([this.sevenDayAverage$, this.productivityTrend$]).pipe(
    rxMap(([average, trend]) => ({ average, trend })),
  );

  sustainabilityAverage$: Observable<number | null> =
    this._metricService.getAverageSustainabilityScore$(7);
  sustainabilityTrend$: Observable<TrendIndicator | null> =
    this._metricService.getSustainabilityTrend$(7);
  sustainabilitySummary$: Observable<{
    average: number | null;
    trend: TrendIndicator | null;
  }> = combineLatest([this.sustainabilityAverage$, this.sustainabilityTrend$]).pipe(
    rxMap(([average, trend]) => ({ average, trend })),
  );

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set day(val: string) {
    const nextDay = val || this._dateService.todayStr();
    this._currentDay = nextDay;
    this.day$.next(nextDay);
  }

  @Input() set timeWorkedToday(val: number | null) {
    this._timeWorkedToday = val;
  }

  ngOnInit(): void {
    this._subs.add(
      this._metricForDay$.subscribe((metric) => {
        this.metricForDay = metric;
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

  updateEnergyCheckin(energyCheckin: number): void {
    this._update({ energyCheckin });
  }

  get totalWorkTimeMs(): number {
    if (this._timeWorkedToday != null) {
      return this._timeWorkedToday;
    }
    const legacyMinutes = this.metricForDay?.totalWorkMinutes;
    if (typeof legacyMinutes === 'number' && !Number.isNaN(legacyMinutes)) {
      return legacyMinutes * 60 * 1000;
    }
    return this.deepWorkTime;
  }

  get totalWorkMinutes(): number {
    const totalMs = this.totalWorkTimeMs;
    return totalMs > 0 ? totalMs / (1000 * 60) : 0;
  }

  get deepWorkTime(): number {
    const focusSessions = this.metricForDay?.focusSessions ?? [];
    return focusSessions.reduce((acc, val) => acc + val, 0);
  }

  get deepWorkMinutes(): number {
    return this.deepWorkTime / (1000 * 60);
  }

  get hasProductivityData(): boolean {
    // impactOfWork can be 0-4, show card if > 0
    return !!this.metricForDay?.impactOfWork && this.metricForDay.impactOfWork > 0;
  }

  get hasSustainabilityData(): boolean {
    return !!this.metricForDay?.energyCheckin;
  }

  get productivityScore(): number {
    const impactRating = this.metricForDay?.impactOfWork ?? 0;
    const focusedMinutes = this.deepWorkMinutes;
    const totalWorkMinutes = this.totalWorkMinutes;
    return calculateProductivityScore(impactRating, focusedMinutes, totalWorkMinutes);
  }

  get sustainabilityScore(): number {
    const focusedMinutes = this.deepWorkMinutes;
    const totalWorkMinutes = this.totalWorkMinutes;
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

  getTrendDelta(trend: TrendIndicator | null): string {
    if (!trend || trend.direction === 'stable') {
      return '±0';
    }
    const change = trend.change;
    return change > 0 ? `+${change}` : `${change}`;
  }

  getTrendClass(
    trend: TrendIndicator | null,
  ): 'trend-up' | 'trend-down' | 'trend-stable' {
    if (!trend || trend.direction === 'stable') {
      return 'trend-stable';
    }
    return trend.direction === 'up' ? 'trend-up' : 'trend-down';
  }

  get dailyStateInfo(): DailyStateInfo {
    return getDailyStateInfo(
      this.metricForDay,
      this.productivityScore,
      this.sustainabilityScore,
    );
  }

  openProductivityBreakdown(): void {
    this._matDialog.open(DialogProductivityBreakdownComponent, {
      data: {
        days: 7,
        endDate: this._currentDay,
      },
      width: '640px',
    });
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
