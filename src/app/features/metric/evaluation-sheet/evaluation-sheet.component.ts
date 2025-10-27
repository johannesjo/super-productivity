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
import { ObstructionService } from '../obstruction/obstruction.service';
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
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MaxDirective } from '../../../ui/validation/max.directive';
import { MinDirective } from '../../../ui/validation/min.directive';
import { ChipListInputComponent } from '../../../ui/chip-list-input/chip-list-input.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatCheckbox } from '@angular/material/checkbox';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MsToStringPipe } from '../../../ui/duration/ms-to-string.pipe';
import { InputDurationDirective } from '../../../ui/duration/input-duration.directive';

@Component({
  selector: 'evaluation-sheet',
  templateUrl: './evaluation-sheet.component.html',
  styleUrls: ['./evaluation-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HelpSectionComponent,
    RouterLink,
    FormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MaxDirective,
    MinDirective,
    MatHint,
    MatError,
    ChipListInputComponent,
    MatButton,
    MatIcon,
    MatRadioGroup,
    MatRadioButton,
    MatCheckbox,
    AsyncPipe,
    TranslatePipe,
    MsToStringPipe,
    InputDurationDirective,
  ],
})
export class EvaluationSheetComponent implements OnDestroy, OnInit {
  obstructionService = inject(ObstructionService);
  improvementService = inject(ImprovementService);
  workContextService = inject(WorkContextService);
  private _metricService = inject(MetricService);
  private _matDialog = inject(MatDialog);
  private _cd = inject(ChangeDetectorRef);
  private _dateService = inject(DateService);

  readonly save = output<any>();
  T: typeof T = T;
  metricForDay?: MetricCopy;
  day$: BehaviorSubject<string> = new BehaviorSubject(this._dateService.todayStr());
  private _metricForDay$: Observable<MetricCopy> = this.day$.pipe(
    switchMap((day) =>
      this._metricService.getMetricForDayOrDefaultWithCheckedImprovements$(day),
    ),
  );
  // isForToday$: Observable<boolean> = this.day$.pipe(map(day => day === getWorklogStr()));
  private _subs: Subscription = new Subscription();

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input() set day(val: string) {
    this.day$.next(val);
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

  updateMood(mood: number): void {
    this._update({ mood });
  }

  updateProductivity(productivity: number): void {
    this._update({ productivity });
  }

  updateFocusQuality(focusQuality: number): void {
    this._update({ focusQuality });
  }

  updateImpactOfWork(impactOfWork: number): void {
    this._update({ impactOfWork });
  }

  updateNotes(notes: string): void {
    this._update({ notes });
  }

  updateRemindTomorrow(remindTomorrow: boolean): void {
    this._update({ remindTomorrow });
  }

  updateDeepWorkTime(milliseconds: number): void {
    // Replace focusSessions with a single manual entry
    this._update({ focusSessions: [milliseconds] });
  }

  get deepWorkTime(): number {
    const focusSessions = this.metricForDay?.focusSessions ?? [];
    return focusSessions.reduce((acc, val) => acc + val, 0);
  }

  get productivityScore(): number {
    const focusQuality = this.metricForDay?.focusQuality ?? 0;
    const impactOfWork = this.metricForDay?.impactOfWork ?? 0;
    const deepWorkHours = this.deepWorkTime / (1000 * 60 * 60);

    // Simple productivity score calculation
    // Score = (Focus Quality * 20) + (Impact * 20) + (Deep Work Hours * 10)
    // Max score: 100 (5 * 20 + 5 * 20 + 6 * 10)
    const focusScore = focusQuality * 20;
    const impactScore = impactOfWork * 20;
    const deepWorkScore = deepWorkHours * 10;
    const score = focusScore + impactScore + deepWorkScore;
    return Math.round(Math.min(score, 100));
  }

  addObstruction(v: string): void {
    this._update({
      obstructions: [...(this.metricForDay as MetricCopy).obstructions, v],
    });
  }

  addNewObstruction(v: string): void {
    const id = this.obstructionService.addObstruction(v);
    this._update({
      obstructions: [...(this.metricForDay as MetricCopy).obstructions, id],
    });
  }

  removeObstruction(idToRemove: string): void {
    this._update({
      obstructions: (this.metricForDay as MetricCopy).obstructions.filter(
        (id) => id !== idToRemove,
      ),
    });
  }

  addImprovement(v: string): void {
    this._update({
      improvements: [...(this.metricForDay as MetricCopy).improvements, v],
    });
  }

  addNewImprovement(v: string): void {
    const id = this.improvementService.addImprovement(v);
    this._update({
      improvements: [...(this.metricForDay as MetricCopy).improvements, id],
    });
  }

  removeImprovement(idToRemove: string): void {
    this._update({
      improvements: (this.metricForDay as MetricCopy).improvements.filter(
        (id) => id !== idToRemove,
      ),
    });
  }

  addImprovementTomorrow(v: string): void {
    this._update({
      improvementsTomorrow: [
        ...(this.metricForDay as MetricCopy).improvementsTomorrow,
        v,
      ],
    });
  }

  addNewImprovementTomorrow(v: string): void {
    const id = this.improvementService.addImprovement(v);
    this._update({
      improvementsTomorrow: [
        ...(this.metricForDay as MetricCopy).improvementsTomorrow,
        id,
      ],
    });
  }

  removeImprovementTomorrow(idToRemove: string): void {
    this._update({
      improvementsTomorrow: (this.metricForDay as MetricCopy).improvementsTomorrow.filter(
        (id) => id !== idToRemove,
      ),
    });
    // this.improvementService.disableImprovementRepeat(idToRemove);
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
  }
}
