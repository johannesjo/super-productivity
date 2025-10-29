import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { MetricService } from './metric.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { fadeAnimation } from '../../ui/animations/fade.ani';
import { T } from '../../t.const';
import { ProjectMetricsService } from './project-metrics.service';
import { WorkContextService } from '../work-context/work-context.service';
import { LazyChartComponent } from './lazy-chart/lazy-chart.component';
import { DecimalPipe } from '@angular/common';
import { MsToStringPipe } from '../../ui/duration/ms-to-string.pipe';
import { TranslatePipe } from '@ngx-translate/core';
import { ActivityHeatmapComponent } from './activity-heatmap/activity-heatmap.component';
import { ShareButtonComponent } from '../../core/share/share-button/share-button.component';
import { ShareFormatter } from '../../core/share/share-formatter';
import { SharePayload } from '../../core/share/share.model';

@Component({
  selector: 'metric',
  templateUrl: './metric.component.html',
  styleUrls: ['./metric.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeAnimation],
  imports: [
    LazyChartComponent,
    DecimalPipe,
    MsToStringPipe,
    TranslatePipe,
    ActivityHeatmapComponent,
    ShareButtonComponent,
  ],
})
export class MetricComponent {
  workContextService = inject(WorkContextService);
  metricService = inject(MetricService);
  projectMetricsService = inject(ProjectMetricsService);

  T: typeof T = T;

  activeWorkContext = toSignal(this.workContextService.activeWorkContext$);

  productivityHappiness = toSignal(
    this.metricService.getProductivityHappinessChartData$(),
  );

  simpleClickCounterData = toSignal(this.metricService.getSimpleClickCounterMetrics$());

  simpleCounterStopWatchData = toSignal(
    this.metricService.getSimpleCounterStopwatchMetrics$(),
  );

  focusSessionData = toSignal(this.metricService.getFocusSessionMetrics$());

  pieChartOptions: ChartConfiguration<'pie', number[], string>['options'] = {
    scales: {
      x: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
    },
    responsive: true,
  };
  pieChartType: ChartType = 'pie';

  lineChartOptions: ChartConfiguration<
    'line',
    (number | undefined)[],
    string
  >['options'] = {
    responsive: true,
    scales: {
      y: {
        ticks: {
          precision: 0,
        },
      },
    },
  };
  lineChartType: ChartType = 'line';

  sharePayload = computed<SharePayload>(() => {
    const sm = this.projectMetricsService.simpleMetrics();
    const workContext = this.activeWorkContext();

    if (!sm) {
      return ShareFormatter.formatPromotion();
    }

    return ShareFormatter.formatWorkSummary(
      {
        totalTimeSpent: sm.timeSpent,
        tasksCompleted: sm.nrOfCompletedTasks,
        dateRange: {
          start: sm.start,
          end: sm.end,
        },
        projectName: workContext?.title,
        detailedMetrics: {
          timeEstimate: sm.timeEstimate,
          totalTasks: sm.nrOfAllTasks,
          daysWorked: sm.daysWorked,
          avgTasksPerDay: sm.avgTasksPerDay,
          avgBreakNr: sm.avgBreakNr,
          avgTimeSpentOnDay: sm.avgTimeSpentOnDay,
          avgTimeSpentOnTask: sm.avgTimeSpentOnTask,
          avgTimeSpentOnTaskIncludingSubTasks: sm.avgTimeSpentOnTaskIncludingSubTasks,
          avgBreakTime: sm.avgBreakTime,
        },
      },
      {
        includeUTM: true,
        includeHashtags: true,
      },
    );
  });
}
